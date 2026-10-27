/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { after } from "next/server";
import { finishPreparation, setPreparedQuantity, setSubstitute } from "@/lib/server-actions/preparation-actions";
import { refundPreparation } from "@/lib/payments/refund";
import { requireOrderManagement } from "@/services/auth/guards";

jest.mock("@/lib/prisma", () => {
    const client = {
        productInCart: { findUnique: jest.fn(), update: jest.fn() },
        order: { findUnique: jest.fn(), updateMany: jest.fn() },
        product: { findUnique: jest.fn(), findMany: jest.fn() },
        storeStock: { findUnique: jest.fn(), updateMany: jest.fn() },
        $transaction: jest.fn(),
    };
    // Transaction interactive : le rappel reçoit le même client simulé
    client.$transaction.mockImplementation((run: (tx: typeof client) => unknown) => run(client));
    return client;
});
jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// Siège ou magasin de la commande : accès accordé, les règles sont testées dans guards.test.ts
jest.mock("@/services/auth/guards", () => ({ requireOrderManagement: jest.fn() }));
jest.mock("@/lib/payments/refund", () => ({ refundPreparation: jest.fn() }));
jest.mock("@/lib/order-emails", () => ({ sendOrderStatusEmail: jest.fn() }));

const ORDER_LINE = {
    id: "line1",
    quantity: 3,
    allowSubstitute: true,
    preparedQuantity: null,
    productId: "p1",
    product: { categories: [{ categoryName: "Yaourts" }] },
    cart: { orders: [{ id: "order1", status: "received", storeId: "store-nantes" }] },
};

describe("setPreparedQuantity", () => {
    beforeEach(() => {
        (prisma.productInCart.findUnique as jest.Mock).mockResolvedValue(ORDER_LINE);
        (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("records the picked quantity and starts the preparation", async () => {
        await expect(setPreparedQuantity("line1", 2)).resolves.toEqual({ ok: true });

        expect(requireOrderManagement).toHaveBeenCalledWith("order1");
        expect(prisma.productInCart.update).toHaveBeenCalledWith({ where: { id: "line1" }, data: { preparedQuantity: 2 } });
        // Premier article traité : la commande passe en préparation (horodatée) et le client est prévenu
        const [[update]] = (prisma.order.updateMany as unknown as jest.Mock<unknown, [{ where: unknown; data: Record<string, unknown> }]>).mock.calls;
        expect(update.where).toEqual({ id: "order1", status: "received" });
        expect(update.data.status).toBe("preparing");
        expect(update.data.preparationStartedAt).toBeInstanceOf(Date);
        expect(after).toHaveBeenCalledTimes(1);
    });

    it("drops the substitute once every unit is picked", async () => {
        await setPreparedQuantity("line1", 3);

        expect(prisma.productInCart.update).toHaveBeenCalledWith({ where: { id: "line1" }, data: { preparedQuantity: 3, substituteId: null } });
    });

    it("refuses a quantity above the one ordered", async () => {
        await expect(setPreparedQuantity("line1", 4)).resolves.toMatchObject({ ok: false });
        expect(prisma.productInCart.update).not.toHaveBeenCalled();
    });

    it("refuses an order that is already ready", async () => {
        (prisma.productInCart.findUnique as jest.Mock).mockResolvedValue({
            ...ORDER_LINE,
            cart: { orders: [{ id: "order1", status: "ready", storeId: "store-nantes" }] },
        });

        await expect(setPreparedQuantity("line1", 2)).resolves.toMatchObject({ ok: false });
        expect(prisma.productInCart.update).not.toHaveBeenCalled();
    });
});

describe("setSubstitute", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("accepts a product with enough stock in the store", async () => {
        (prisma.productInCart.findUnique as jest.Mock).mockResolvedValue({ ...ORDER_LINE, preparedQuantity: 1 });
        (prisma.storeStock.findUnique as jest.Mock).mockResolvedValue({ quantity: 5 });

        await expect(setSubstitute("line1", "p2")).resolves.toEqual({ ok: true });
        expect(prisma.productInCart.update).toHaveBeenCalledWith({ where: { id: "line1" }, data: { substituteId: "p2" } });
    });

    it("refuses a substitute without enough stock for the missing units", async () => {
        (prisma.productInCart.findUnique as jest.Mock).mockResolvedValue({ ...ORDER_LINE, preparedQuantity: 0 });
        (prisma.storeStock.findUnique as jest.Mock).mockResolvedValue({ quantity: 2 });

        await expect(setSubstitute("line1", "p2")).resolves.toMatchObject({ ok: false });
        expect(prisma.productInCart.update).not.toHaveBeenCalled();
    });

    it("refuses when the customer declined substitutions", async () => {
        (prisma.productInCart.findUnique as jest.Mock).mockResolvedValue({ ...ORDER_LINE, preparedQuantity: 0, allowSubstitute: false });

        await expect(setSubstitute("line1", "p2")).resolves.toMatchObject({ ok: false });
        expect(prisma.productInCart.update).not.toHaveBeenCalled();
    });
});

describe("finishPreparation", () => {
    const line = (overrides: object) => ({
        productId: "p1",
        quantity: 2,
        preparedQuantity: 2,
        allowSubstitute: true,
        substituteId: null,
        product: { name: "Yaourt nature", price: 2000 },
        substitute: null,
        ...overrides,
    });
    const ORDER = {
        status: "preparing",
        storeId: "store-nantes",
        stripeSessionId: "cs_test_1",
        loyaltyDiscount: 0,
        antiGaspiDiscount: 0,
        cart: {
            productsInCart: [
                line({}),
                line({ productId: "p3", product: { name: "Beurre doux", price: 2500 }, quantity: 1, preparedQuantity: 0 }),
                line({
                    productId: "p4",
                    preparedQuantity: 1,
                    substituteId: "p5",
                    product: { name: "Lait entier", price: 1200 },
                    substitute: { name: "Lait demi-écrémé", price: 1000 },
                }),
            ],
        },
    };

    beforeEach(() => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue(ORDER);
        (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
        (refundPreparation as jest.Mock).mockResolvedValue({ refunded: true, amount: 2700 });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("refunds the difference, fixes the store stock and marks the order ready", async () => {
        await expect(finishPreparation("order1")).resolves.toEqual({ ok: true });

        // Beurre manquant (25,00 €) et lait remplacé moins cher (2,00 €)
        expect(refundPreparation).toHaveBeenCalledWith("cs_test_1", 2700);
        const [[update]] = (prisma.order.updateMany as jest.Mock<Promise<{ count: number }>, [unknown]>).mock.calls;
        expect(update).toMatchObject({
            where: { id: "order1", status: { in: ["received", "preparing"] } },
            data: { status: "ready", preparationRefund: 2700 },
        });
        // Rayons vides remis à zéro, remplaçant décompté
        expect(prisma.storeStock.updateMany).toHaveBeenCalledWith({ where: { storeId: "store-nantes", productId: "p3" }, data: { quantity: 0 } });
        expect(prisma.storeStock.updateMany).toHaveBeenCalledWith({ where: { storeId: "store-nantes", productId: "p4" }, data: { quantity: 0 } });
        expect(prisma.storeStock.updateMany).toHaveBeenCalledWith({
            where: { storeId: "store-nantes", productId: "p5", quantity: { gte: 1 } },
            data: { quantity: { decrement: 1 } },
        });
        expect(prisma.storeStock.updateMany).toHaveBeenCalledTimes(3);
        expect(after).toHaveBeenCalledTimes(1);
    });

    it("never refunds more than the customer paid after the loyalty vouchers", async () => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...ORDER, loyaltyDiscount: 8000 });

        await finishPreparation("order1");

        // Articles : 40,00 + 25,00 + 24,00 = 89,00 €, moins 80,00 € de bons
        expect(refundPreparation).toHaveBeenCalledWith("cs_test_1", 900);
    });

    it("waits until every item is handled", async () => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({
            ...ORDER,
            cart: { productsInCart: [line({}), line({ preparedQuantity: null })] },
        });

        await expect(finishPreparation("order1")).resolves.toMatchObject({ ok: false, error: "Il reste 1 article à traiter." });
        expect(refundPreparation).not.toHaveBeenCalled();
    });

    it("keeps the order in preparation when the refund fails", async () => {
        (refundPreparation as jest.Mock).mockRejectedValue(new Error("Stripe indisponible"));
        jest.spyOn(console, "error").mockImplementation(() => undefined);

        await expect(finishPreparation("order1")).resolves.toMatchObject({ ok: false });
        expect(prisma.order.updateMany).not.toHaveBeenCalled();
        expect(after).not.toHaveBeenCalled();
    });

    it("changes nothing when the order moved on in the meantime", async () => {
        (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

        await expect(finishPreparation("order1")).resolves.toMatchObject({ ok: false });
        expect(prisma.storeStock.updateMany).not.toHaveBeenCalled();
        expect(after).not.toHaveBeenCalled();
    });
});
