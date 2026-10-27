/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { closeLot } from "@/lib/server-actions/anti-gaspi-admin-actions";
import { AccessDeniedError, requireBackOffice } from "@/services/auth/guards";

jest.mock("@/lib/prisma", () => {
    const client = {
        storeStock: { findUnique: jest.fn(), update: jest.fn() },
        stockLot: { findUnique: jest.fn(), update: jest.fn() },
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

describe("closeLot", () => {
    beforeEach(() => {
        (requireBackOffice as jest.Mock).mockResolvedValue({ userId: "manager", store: NANTES });
        (prisma.stockLot.findUnique as jest.Mock)
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

        const [[lotUpdate]] = (prisma.stockLot.update as unknown as jest.Mock<unknown, [{ data: Record<string, unknown> }]>).mock.calls;
        expect(lotUpdate.data).toMatchObject({ quantity: 0, donatedQuantity: { increment: 4 } });
        expect(lotUpdate.data.closedAt).toBeInstanceOf(Date);
        expect(prisma.storeStock.update).toHaveBeenCalledWith({
            where: { storeId_productId: { storeId: "nantes", productId: "p1" } },
            data: { quantity: 5 },
        });
    });

    it("refuses a lot of another store", async () => {
        (prisma.stockLot.findUnique as jest.Mock).mockReset().mockResolvedValue({ storeId: "rennes", productId: "p1", closedAt: null });

        await expect(closeLot("lot1", "wasted")).rejects.toThrow(AccessDeniedError);
        expect(prisma.stockLot.update).not.toHaveBeenCalled();
    });
});
