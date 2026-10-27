/**
 * @jest-environment node
 */
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { releaseAllocations, setStockQuantity, takeFromLots, trimAllocations } from "@/lib/stock-lots";
import { bestBeforeIn } from "@/lib/shelf-life";

jest.mock("@/lib/prisma", () => ({
    stockLot: { update: jest.fn((args: object) => args) },
    lotAllocation: { deleteMany: jest.fn((args: object) => args) },
}));

// Transaction simulée : seules les tables utilisées par les mouvements de lots
const tx = {
    stockLot: { findMany: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    storeStock: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    lotAllocation: { create: jest.fn(), findMany: jest.fn(), delete: jest.fn(), update: jest.fn() },
};
const client = tx as unknown as Prisma.TransactionClient;

// Arguments d'un appel simulé
function call<T>(mock: jest.Mock, index = 0) {
    return (mock as jest.Mock<unknown, [T]>).mock.calls[index][0];
}

describe("takeFromLots", () => {
    beforeEach(() => {
        tx.stockLot.findMany.mockResolvedValue([
            { id: "recent", quantity: 3 },
            { id: "older", quantity: 5 },
        ]);
        tx.stockLot.updateMany.mockResolvedValue({ count: 1 });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("serves the longest dates first and traces each lot on the order line", async () => {
        const taken = await takeFromLots(client, { storeId: "nantes", productId: "p1", quantity: 4, outcome: "sold", order: "freshest", lineId: "line1" });

        expect(taken).toBe(4);
        expect(call<{ orderBy: unknown }>(tx.stockLot.findMany).orderBy).toEqual([{ bestBefore: "desc" }, { createdAt: "asc" }]);
        expect(tx.stockLot.updateMany).toHaveBeenCalledWith({
            where: { id: "recent", quantity: { gte: 3 } },
            data: { quantity: { decrement: 3 }, soldQuantity: { increment: 3 } },
        });
        // Lot vidé : il est clos
        expect(tx.stockLot.updateMany).toHaveBeenCalledWith({ where: { id: "recent", quantity: 0, closedAt: null }, data: { closedAt: expect.any(Date) as Date } });
        expect(tx.stockLot.updateMany).toHaveBeenCalledWith({
            where: { id: "older", quantity: { gte: 1 } },
            data: { quantity: { decrement: 1 }, soldQuantity: { increment: 1 } },
        });
        expect(tx.lotAllocation.create).toHaveBeenCalledWith({ data: { lineId: "line1", lotId: "recent", quantity: 3 } });
        expect(tx.lotAllocation.create).toHaveBeenCalledWith({ data: { lineId: "line1", lotId: "older", quantity: 1 } });
    });

    it("skips a lot another order emptied in the meantime", async () => {
        tx.stockLot.updateMany.mockResolvedValueOnce({ count: 0 });

        const taken = await takeFromLots(client, { storeId: "nantes", productId: "p1", quantity: 4, outcome: "sold", order: "freshest" });

        expect(taken).toBe(4);
        expect(tx.stockLot.updateMany).toHaveBeenCalledWith({
            where: { id: "older", quantity: { gte: 4 } },
            data: { quantity: { decrement: 4 }, soldQuantity: { increment: 4 } },
        });
    });
});

describe("setStockQuantity", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("adds the units found on the shelf as a lot at the usual date", async () => {
        tx.storeStock.findUnique.mockResolvedValue({ quantity: 10 });

        await setStockQuantity(client, { storeId: "nantes", productId: "p1", quantity: 16, shelfLife: 21 });

        expect(call<{ data: Record<string, unknown> }>(tx.stockLot.create).data).toMatchObject({
            quantity: 6,
            initialQuantity: 6,
            bestBefore: bestBeforeIn(21),
            markdownDays: 5,
        });
        expect(tx.storeStock.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ update: { quantity: { increment: 6 } } })
        );
    });

    it("removes missing units from the shortest dates", async () => {
        tx.storeStock.findUnique.mockResolvedValue({ quantity: 10 });
        tx.stockLot.findMany.mockResolvedValue([{ id: "old", quantity: 8 }]);
        tx.stockLot.updateMany.mockResolvedValue({ count: 1 });

        await setStockQuantity(client, { storeId: "nantes", productId: "p1", quantity: 7, shelfLife: 21 });

        expect(call<{ orderBy: unknown }>(tx.stockLot.findMany).orderBy).toEqual([{ bestBefore: "asc" }, { createdAt: "asc" }]);
        expect(tx.stockLot.updateMany).toHaveBeenCalledWith({
            where: { id: "old", quantity: { gte: 3 } },
            data: { quantity: { decrement: 3 }, adjustedQuantity: { increment: 3 } },
        });
        expect(tx.storeStock.update).toHaveBeenCalledWith({ where: { storeId_productId: { storeId: "nantes", productId: "p1" } }, data: { quantity: 7 } });
    });
});

describe("allocations", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("drops the missing units from the latest allocations", async () => {
        tx.lotAllocation.findMany.mockResolvedValue([
            { id: "a2", quantity: 1 },
            { id: "a1", quantity: 3 },
        ]);

        await trimAllocations(client, "line1", 2);

        expect(tx.lotAllocation.delete).toHaveBeenCalledWith({ where: { id: "a2" } });
        expect(tx.lotAllocation.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { quantity: { decrement: 1 } } });
    });

    it("gives the units of a cancelled order back to their lots", () => {
        releaseAllocations([{ id: "a1", lotId: "lot1", quantity: 2 }]);

        expect(prisma.stockLot.update).toHaveBeenCalledWith({
            where: { id: "lot1" },
            data: { quantity: { increment: 2 }, soldQuantity: { decrement: 2 }, closedAt: null },
        });
        expect(prisma.lotAllocation.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["a1"] } } });
        expect(releaseAllocations([])).toEqual([]);
    });
});
