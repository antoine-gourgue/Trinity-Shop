/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { autoReplenish, receiveOverdueRestocks, withdrawExpiredLots } from "@/lib/stock-maintenance";

jest.mock("@/lib/prisma", () => {
    const client = {
        storeStock: { findMany: jest.fn() },
        restockOrder: { findMany: jest.fn(), createMany: jest.fn() },
        product: { findMany: jest.fn() },
        stockLot: { createMany: jest.fn() },
        $queryRaw: jest.fn(),
        $executeRaw: jest.fn(),
        $transaction: jest.fn(),
    };
    // Transaction interactive (rappel) ou lot d'opérations (tableau)
    client.$transaction.mockImplementation((operations: unknown) =>
        typeof operations === "function" ? (operations as (tx: typeof client) => unknown)(client) : Promise.all(operations as unknown[])
    );
    return client;
});

describe("withdrawExpiredLots", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("takes the lots past their date out of the stock, to be thrown away (never donated)", async () => {
        (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(5).mockResolvedValueOnce(7);

        await expect(withdrawExpiredLots(new Date("2026-10-27T23:05:00Z"))).resolves.toBe(7);

        const [[stockQuery, stockToday], [lotQuery]] = (prisma.$executeRaw as jest.Mock<unknown, [TemplateStringsArray, Date]>).mock.calls;
        expect(stockQuery.join("?")).toContain('UPDATE "StoreStock"');
        expect(lotQuery.join("?")).toContain('SET "withdrawnAt" = NOW()');
        expect(lotQuery.join("?")).not.toContain("donatedQuantity");
        // Date du jour à Paris : les lots datés d'hier ou avant
        expect(stockToday).toEqual(new Date("2026-10-28T00:00:00Z"));
    });
});

describe("autoReplenish", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("orders every product under the threshold that has no order on the way", async () => {
        (prisma.storeStock.findMany as jest.Mock).mockResolvedValue([
            { storeId: "nantes", productId: "p1", quantity: 4 },
            { storeId: "nantes", productId: "p2", quantity: 0 },
        ]);
        (prisma.restockOrder.findMany as jest.Mock).mockResolvedValue([{ storeId: "nantes", productId: "p2" }]);

        await expect(autoReplenish(new Date("2026-10-27T23:05:00Z"))).resolves.toBe(1);

        const [[{ data }]] = (prisma.restockOrder.createMany as unknown as jest.Mock<unknown, [{ data: Record<string, unknown>[] }]>).mock.calls;
        expect(data).toEqual([
            { storeId: "nantes", productId: "p1", quantity: 76, automatic: true, expectedAt: new Date("2026-10-29T06:00:00Z") },
        ]);
    });
});

describe("receiveOverdueRestocks", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("brings yesterday's unreceived deliveries into stock at the usual date", async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: "r1", storeId: "nantes", productId: "p1", quantity: 60 }]);
        (prisma.product.findMany as jest.Mock).mockResolvedValue([{ id: "p1", shelfLifeDays: 4 }]);

        await expect(receiveOverdueRestocks(new Date("2026-10-27T23:05:00Z"))).resolves.toBe(1);

        const [[{ data }]] = (prisma.stockLot.createMany as unknown as jest.Mock<unknown, [{ data: Record<string, unknown>[] }]>).mock.calls;
        // Pain : 4 jours à partir du 28 octobre (heure de Paris), soldé la veille seulement
        expect(data).toEqual([
            {
                storeId: "nantes",
                productId: "p1",
                quantity: 60,
                initialQuantity: 60,
                bestBefore: new Date("2026-11-01T00:00:00Z"),
                markdownDays: 1,
                restockOrderId: "r1",
            },
        ]);
        expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("does nothing when every delivery was received", async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

        await expect(receiveOverdueRestocks()).resolves.toBe(0);
        expect(prisma.stockLot.createMany).not.toHaveBeenCalled();
    });
});
