/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { cancelRestock, orderRestock, receiveRestock } from "@/lib/server-actions/restock-actions";
import { AccessDeniedError, requireBackOffice } from "@/services/auth/guards";
import { addLot } from "@/lib/stock-lots";
import { parisDay } from "@/lib/anti-gaspi";

jest.mock("@/lib/prisma", () => {
    const client = {
        product: { findUnique: jest.fn() },
        restockOrder: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
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
// Entrée en stock testée à part (stock-lots)
jest.mock("@/lib/stock-lots", () => ({ addLot: jest.fn() }));

const NANTES = { id: "nantes", slug: "nantes-beaujoire", name: "Trinity Nantes Beaujoire" };
const inDays = (days: number) => parisDay(new Date(Date.now() + days * 86_400_000));
const ORDERED = { id: "r1", storeId: "nantes", productId: "p1", quantity: 60, status: "ordered", product: { shelfLifeDays: 21 } };

describe("orderRestock", () => {
    beforeEach(() => {
        (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "manager", store: NANTES });
        (prisma.product.findUnique as jest.Mock).mockResolvedValue({ hidden: false });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("orders for the store of a store account, delivered the next day", async () => {
        await expect(orderRestock({ storeId: "rennes", productId: "p1", quantity: 60 })).resolves.toEqual({ ok: true });

        const [[{ data }]] = (prisma.restockOrder.create as unknown as jest.Mock<unknown, [{ data: Record<string, unknown> }]>).mock.calls;
        // Le magasin du compte, pas celui envoyé par le navigateur
        expect(data).toMatchObject({ storeId: "nantes", productId: "p1", quantity: 60 });
        expect((data.expectedAt as Date).getTime()).toBeGreaterThan(Date.now());
    });

    it("asks the head office which store to restock, and refuses a product off the catalogue", async () => {
        (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "admin", store: null });
        await expect(orderRestock({ storeId: null, productId: "p1", quantity: 60 })).resolves.toEqual({
            ok: false,
            error: "Choisissez le magasin à réapprovisionner.",
        });

        (prisma.product.findUnique as jest.Mock).mockResolvedValue({ hidden: true });
        await expect(orderRestock({ storeId: "rennes", productId: "p1", quantity: 60 })).resolves.toMatchObject({ ok: false });
        expect(prisma.restockOrder.create).not.toHaveBeenCalled();
    });
});

describe("receiveRestock", () => {
    beforeEach(() => {
        (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "manager", store: NANTES });
        (prisma.restockOrder.findUnique as jest.Mock).mockResolvedValue(ORDERED);
        (prisma.restockOrder.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("turns the delivery into a dated lot", async () => {
        await expect(receiveRestock("r1", { quantity: 58, bestBefore: inDays(20) })).resolves.toEqual({ ok: true });

        expect(addLot).toHaveBeenCalledWith(prisma, {
            storeId: "nantes",
            productId: "p1",
            quantity: 58,
            bestBefore: new Date(`${inDays(20)}T00:00:00Z`),
            shelfLife: 21,
            restockOrderId: "r1",
        });
    });

    it("refuses a date already reached, and a second reception", async () => {
        await expect(receiveRestock("r1", { quantity: 58, bestBefore: inDays(0) })).resolves.toMatchObject({ ok: false });

        (prisma.restockOrder.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
        await expect(receiveRestock("r1", { quantity: 58, bestBefore: inDays(20) })).resolves.toMatchObject({ ok: false });
        expect(addLot).not.toHaveBeenCalled();
    });

    it("refuses the delivery of another store", async () => {
        (prisma.restockOrder.findUnique as jest.Mock).mockResolvedValue({ ...ORDERED, storeId: "rennes" });

        await expect(receiveRestock("r1", { quantity: 58, bestBefore: inDays(20) })).rejects.toThrow(AccessDeniedError);
        await expect(cancelRestock("r1")).rejects.toThrow(AccessDeniedError);
        expect(prisma.restockOrder.updateMany).not.toHaveBeenCalled();
    });
});
