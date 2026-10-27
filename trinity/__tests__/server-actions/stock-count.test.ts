/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { correctStockCount } from "@/lib/server-actions/admin-actions";
import { requireStockManagement } from "@/services/auth/guards";
import { setStockQuantity } from "@/lib/stock-lots";
import { parisDay } from "@/lib/anti-gaspi";

jest.mock("@/lib/prisma", () => {
    const client = {
        storeStock: { findUnique: jest.fn() },
        $transaction: jest.fn(),
    };
    // Transaction interactive : le rappel reçoit le même client simulé
    client.$transaction.mockImplementation((run: (tx: typeof client) => unknown) => run(client));
    return client;
});
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("@/services/auth/guards", () => ({
    requireAdmin: jest.fn(),
    requireOrderManagement: jest.fn(),
    requireStockManagement: jest.fn(),
    currentAccess: jest.fn(),
}));
jest.mock("@/lib/order-emails", () => ({ sendOrderStatusEmail: jest.fn() }));
// Mouvements de lots testés à part (stock-lots)
jest.mock("@/lib/stock-lots", () => ({ setStockQuantity: jest.fn(), releaseAllocations: jest.fn(() => []) }));

const STOCK = { storeId: "nantes", productId: "p1", quantity: 10, product: { shelfLifeDays: 21 } };
const inDays = (days: number) => parisDay(new Date(Date.now() + days * 86_400_000));

describe("correctStockCount", () => {
    beforeEach(() => {
        (prisma.storeStock.findUnique as jest.Mock).mockResolvedValue(STOCK);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("takes missing units out of the lots, without asking for a date", async () => {
        await expect(correctStockCount("s1", { quantity: 7, bestBefore: null })).resolves.toEqual({ ok: true });

        expect(requireStockManagement).toHaveBeenCalledWith("s1");
        expect(setStockQuantity).toHaveBeenCalledWith(prisma, { storeId: "nantes", productId: "p1", quantity: 7, shelfLife: 21, bestBefore: undefined });
    });

    it("needs the date of the units found in excess", async () => {
        await expect(correctStockCount("s1", { quantity: 14, bestBefore: null })).resolves.toEqual({
            ok: false,
            error: "Indiquez la date limite des unités trouvées en plus.",
        });
        await expect(correctStockCount("s1", { quantity: 14, bestBefore: inDays(0) })).resolves.toMatchObject({ ok: false });
        expect(setStockQuantity).not.toHaveBeenCalled();

        await expect(correctStockCount("s1", { quantity: 14, bestBefore: inDays(9) })).resolves.toEqual({ ok: true });
        expect(setStockQuantity).toHaveBeenCalledWith(prisma, {
            storeId: "nantes",
            productId: "p1",
            quantity: 14,
            shelfLife: 21,
            bestBefore: new Date(`${inDays(9)}T00:00:00Z`),
        });
    });
});
