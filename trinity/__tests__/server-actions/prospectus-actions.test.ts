/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { deleteProspectus, saveProspectus, stopProspectus, type ProspectusInput } from "@/lib/server-actions/prospectus-actions";
import { AccessDeniedError, requireBackOffice } from "@/services/auth/guards";
import { parisDay } from "@/lib/anti-gaspi";

jest.mock("@/lib/prisma", () => {
  const client = {
    product: { findMany: jest.fn() },
    prospectus: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    prospectusItem: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  // Transaction interactive : le rappel reçoit le même client simulé
  client.$transaction.mockImplementation((run: (tx: typeof client) => unknown) => run(client));
  return client;
});
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/services/auth/guards", () => ({
  ...jest.requireActual<typeof import("@/services/auth/guards")>("@/services/auth/guards"),
  requireBackOffice: jest.fn(),
}));

// Données écrites par les actions, lues dans les appels simulés
type ProspectusData = {
  storeId?: string;
  title?: string;
  startsAt: Date;
  endsAt: Date;
  publishedAt?: Date | null;
  items?: { create: { productId: string; price: number }[] };
};
const findProducts = prisma.product.findMany as unknown as jest.Mock;
const createProspectus = prisma.prospectus.create as unknown as jest.Mock<Promise<{ id: string }>, [{ data: ProspectusData }]>;
const updateProspectus = prisma.prospectus.update as unknown as jest.Mock<Promise<{ id: string }>, [{ data: ProspectusData }]>;
const findProspectus = prisma.prospectus.findUnique as unknown as jest.Mock;

const NANTES = { id: "nantes", slug: "nantes-beaujoire", name: "Trinity Nantes Beaujoire" };
const inDays = (days: number) => parisDay(new Date(Date.now() + days * 86_400_000));
const HOUR = 3_600_000;

const INPUT: ProspectusInput = {
  id: null,
  storeId: "rennes",
  title: "Les prix d'automne",
  firstDay: inDays(1),
  lastDay: inDays(7),
  items: [
    { productId: "lait", price: 0.99 },
    { productId: "cafe", price: 3.49 },
  ],
  publish: false,
};

describe("saveProspectus", () => {
  beforeEach(() => {
    (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "manager", store: NANTES });
    findProducts.mockResolvedValue([
      { id: "lait", name: "Lait", price: 1190, hidden: false },
      { id: "cafe", name: "Café", price: 4590, hidden: false },
    ]);
    createProspectus.mockResolvedValue({ id: "new" });
    updateProspectus.mockResolvedValue({ id: "p1" });
  });

  afterEach(() => jest.clearAllMocks());

  it("creates a draft for the store of the account, prices in thousandths of a euro", async () => {
    await expect(saveProspectus(INPUT)).resolves.toEqual({ ok: true, id: "new" });
    // Le magasin du compte s'impose, même si un autre est demandé
    const { data } = createProspectus.mock.calls[0][0];
    expect(data).toMatchObject({
      storeId: "nantes",
      title: "Les prix d'automne",
      publishedAt: null,
      items: { create: [{ productId: "lait", price: 990 }, { productId: "cafe", price: 3490 }] },
    });
    // Du premier jour à minuit au lendemain du dernier jour, à minuit
    expect(parisDay(data.startsAt)).toBe(INPUT.firstDay);
    expect(parisDay(new Date(data.endsAt.getTime() - 1))).toBe(INPUT.lastDay);
  });

  it("publishes right away when asked", async () => {
    await saveProspectus({ ...INPUT, publish: true });
    expect(createProspectus.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date);
  });

  it("asks the head office to choose the store", async () => {
    (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "admin", store: null });
    await expect(saveProspectus({ ...INPUT, storeId: null })).resolves.toEqual({ ok: false, error: "Choisissez le magasin du prospectus." });
    await saveProspectus(INPUT);
    expect(createProspectus.mock.calls[0][0].data.storeId).toBe("rennes");
  });

  it("refuses a price that is not a real discount", async () => {
    const result = await saveProspectus({ ...INPUT, items: [{ productId: "lait", price: 1.19 }] });
    expect(result).toEqual({ ok: false, error: "Lait : Le prix du prospectus doit être plus bas que le prix actuel." });
    expect(createProspectus).not.toHaveBeenCalled();
  });

  it("refuses past, reversed or too long dates", async () => {
    await expect(saveProspectus({ ...INPUT, firstDay: inDays(-1) })).resolves.toEqual({
      ok: false,
      error: "Le prospectus ne peut pas commencer avant aujourd'hui.",
    });
    // Dernier jour (aujourd'hui) avant le premier (demain)
    await expect(saveProspectus({ ...INPUT, lastDay: inDays(0) })).resolves.toEqual({ ok: false, error: "Le dernier jour doit suivre le premier." });
    await expect(saveProspectus({ ...INPUT, lastDay: inDays(40) })).resolves.toEqual({ ok: false, error: "Un prospectus dure 31 jours au plus." });
  });

  it("refuses the same product twice", async () => {
    const result = await saveProspectus({ ...INPUT, items: [INPUT.items[0], { productId: "lait", price: 0.89 }] });
    expect(result).toEqual({ ok: false, error: "Un produit apparaît deux fois." });
  });

  it("keeps the first day of a running prospectus and replaces its products", async () => {
    const startsAt = new Date(Date.now() - 48 * HOUR);
    findProspectus.mockResolvedValue({
      id: "p1",
      storeId: "nantes",
      publishedAt: new Date(Date.now() - 72 * HOUR),
      startsAt,
      endsAt: new Date(Date.now() + 96 * HOUR),
      _count: { items: 2 },
    });
    await expect(saveProspectus({ ...INPUT, id: "p1", firstDay: inDays(3) })).resolves.toEqual({ ok: true, id: "p1" });
    expect(prisma.prospectusItem.deleteMany).toHaveBeenCalledWith({ where: { prospectusId: "p1" } });
    const { data } = updateProspectus.mock.calls[0][0];
    expect(parisDay(data.startsAt)).toBe(parisDay(startsAt));
    expect(data.publishedAt).toBeInstanceOf(Date);
  });

  it("refuses to edit an ended prospectus, or one from another store", async () => {
    findProspectus.mockResolvedValue({
      id: "p1",
      storeId: "nantes",
      publishedAt: new Date(Date.now() - 240 * HOUR),
      startsAt: new Date(Date.now() - 200 * HOUR),
      endsAt: new Date(Date.now() - HOUR),
      _count: { items: 2 },
    });
    await expect(saveProspectus({ ...INPUT, id: "p1" })).resolves.toEqual({ ok: false, error: "Ce prospectus est terminé : il ne se modifie plus." });

    findProspectus.mockResolvedValue({ id: "p2", storeId: "rennes", publishedAt: null, startsAt: new Date(), endsAt: new Date(), _count: { items: 0 } });
    await expect(saveProspectus({ ...INPUT, id: "p2" })).rejects.toBeInstanceOf(AccessDeniedError);
  });
});

describe("stopProspectus and deleteProspectus", () => {
  const running = {
    id: "p1",
    storeId: "nantes",
    publishedAt: new Date(Date.now() - 72 * HOUR),
    startsAt: new Date(Date.now() - 48 * HOUR),
    endsAt: new Date(Date.now() + 96 * HOUR),
    _count: { items: 2 },
  };

  beforeEach(() => {
    (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "manager", store: NANTES });
  });

  afterEach(() => jest.clearAllMocks());

  it("ends a running prospectus now", async () => {
    findProspectus.mockResolvedValue(running);
    await expect(stopProspectus("p1")).resolves.toEqual({ ok: true });
    const { data } = updateProspectus.mock.calls[0][0];
    expect(Math.abs(data.endsAt.getTime() - Date.now())).toBeLessThan(5000);
  });

  it("refuses to delete a running prospectus", async () => {
    findProspectus.mockResolvedValue(running);
    await expect(deleteProspectus("p1")).resolves.toEqual({ ok: false, error: "Arrêtez ce prospectus avant de le supprimer." });
    expect(prisma.prospectus.delete).not.toHaveBeenCalled();
  });
});
