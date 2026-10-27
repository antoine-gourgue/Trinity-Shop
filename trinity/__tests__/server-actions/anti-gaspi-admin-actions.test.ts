/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { closeLot, declareLot, type LotInput } from "@/lib/server-actions/anti-gaspi-admin-actions";
import { AccessDeniedError, requireBackOffice } from "@/services/auth/guards";
import { parisDay } from "@/lib/anti-gaspi";

jest.mock("@/lib/prisma", () => {
    const client = {
        storeStock: { findUnique: jest.fn(), update: jest.fn() },
        antiGaspiLot: { aggregate: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
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

const NANTES = { id: "nantes", slug: "nantes-beaujoire", name: "Trinity Nantes Beaujoire" };
const inDays = (days: number) => parisDay(new Date(Date.now() + days * 86_400_000));
const INPUT: LotInput = { storeId: null, productId: "p1", quantity: 6, bestBefore: inDays(3) };

describe("declareLot", () => {
    beforeEach(() => {
        (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "manager", store: NANTES });
        (prisma.storeStock.findUnique as jest.Mock).mockResolvedValue({ quantity: 10 });
        (prisma.antiGaspiLot.aggregate as jest.Mock).mockResolvedValue({ _sum: { quantity: 3 } });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("declares a lot in the store of a store account", async () => {
        await expect(declareLot({ ...INPUT, quantity: 7 })).resolves.toEqual({ ok: true });

        const [[{ data }]] = (prisma.antiGaspiLot.create as unknown as jest.Mock<unknown, [{ data: Record<string, unknown> }]>).mock.calls;
        expect(data).toMatchObject({ storeId: "nantes", productId: "p1", quantity: 7, initialQuantity: 7 });
        expect(data.bestBefore).toEqual(new Date(`${INPUT.bestBefore}T00:00:00Z`));
    });

    it("never puts more units in lots than the store has in stock", async () => {
        // 10 en stock, dont 3 déjà en lots
        await expect(declareLot({ ...INPUT, quantity: 8 })).resolves.toEqual({
            ok: false,
            error: "Le magasin n'a que 7 unités de ce produit hors lots anti-gaspi.",
        });
        expect(prisma.antiGaspiLot.create).not.toHaveBeenCalled();
    });

    it("refuses a date already past, or too far away", async () => {
        await expect(declareLot({ ...INPUT, bestBefore: inDays(-1) })).resolves.toMatchObject({ ok: false });
        await expect(declareLot({ ...INPUT, bestBefore: inDays(90) })).resolves.toMatchObject({ ok: false });
        expect(prisma.antiGaspiLot.create).not.toHaveBeenCalled();
    });

    it("asks the head office which store the lot belongs to", async () => {
        (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "admin", store: null });

        await expect(declareLot(INPUT)).resolves.toEqual({ ok: false, error: "Choisissez le magasin du lot." });
        await expect(declareLot({ ...INPUT, storeId: "rennes" })).resolves.toEqual({ ok: true });
    });
});

describe("closeLot", () => {
    beforeEach(() => {
        (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "manager", store: NANTES });
        (prisma.antiGaspiLot.findUnique as jest.Mock)
            .mockResolvedValueOnce({ storeId: "nantes", productId: "p1", closedAt: null })
            .mockResolvedValueOnce({ quantity: 4, closedAt: null });
        (prisma.storeStock.findUnique as jest.Mock).mockResolvedValue({ quantity: 9 });
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it("donates the remaining units and takes them out of the store stock", async () => {
        (prisma.$transaction as jest.Mock).mockImplementation((run: (tx: typeof prisma) => unknown) => run(prisma));

        await expect(closeLot("lot1", "donated")).resolves.toEqual({ ok: true });

        const [[lotUpdate]] = (prisma.antiGaspiLot.update as unknown as jest.Mock<unknown, [{ data: Record<string, unknown> }]>).mock.calls;
        expect(lotUpdate.data).toMatchObject({ quantity: 0, donatedQuantity: { increment: 4 } });
        expect(lotUpdate.data.closedAt).toBeInstanceOf(Date);
        expect(prisma.storeStock.update).toHaveBeenCalledWith({
            where: { storeId_productId: { storeId: "nantes", productId: "p1" } },
            data: { quantity: 5 },
        });
    });

    it("refuses a lot of another store", async () => {
        (prisma.antiGaspiLot.findUnique as jest.Mock).mockReset().mockResolvedValue({ storeId: "rennes", productId: "p1", closedAt: null });

        await expect(closeLot("lot1", "wasted")).rejects.toThrow(AccessDeniedError);
        expect(prisma.antiGaspiLot.update).not.toHaveBeenCalled();
    });
});
