/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { after } from "next/server";
import { advanceOrderStatus, cancelOrder } from "@/lib/server-actions/admin-actions";
import { refundOrderPayment } from "@/lib/payments/refund";

jest.mock("@/lib/prisma", () => ({
    order: { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    loyaltyTransaction: { deleteMany: jest.fn() },
    user: { update: jest.fn() },
    stock: { updateMany: jest.fn() },
    $transaction: jest.fn(),
}));
jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/services/auth/guards", () => ({ requireAdmin: jest.fn(), currentAccess: jest.fn() }));
jest.mock("@/lib/payments/refund", () => ({ refundOrderPayment: jest.fn() }));
jest.mock("@/lib/order-emails", () => ({ sendOrderStatusEmail: jest.fn() }));

const PAID_ORDER = {
    userId: "user1",
    cartId: "cart1",
    status: "received",
    stripeSessionId: "cs_test_1",
    stockDeducted: true,
    loyaltyPointsEarned: 13,
    loyaltyPointsUsed: 0,
    user: { loyaltyPoints: 40 },
    cart: { productsInCart: [{ productId: "p1", quantity: 2 }] },
};

describe("cancelOrder", () => {
    beforeEach(() => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue(PAID_ORDER);
        (refundOrderPayment as jest.Mock).mockResolvedValue({ refunded: true, amount: 13470 });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("refunds the card payment, then cancels and emails the customer", async () => {
        await expect(cancelOrder("order1")).resolves.toEqual({ ok: true });

        expect(refundOrderPayment).toHaveBeenCalledWith("cs_test_1");
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: "order1" }, data: { status: "cancelled", stockDeducted: false } });
        expect(after).toHaveBeenCalledTimes(1);
    });

    it("leaves the order untouched when the refund fails", async () => {
        (refundOrderPayment as jest.Mock).mockRejectedValue(new Error("Stripe indisponible"));
        jest.spyOn(console, "error").mockImplementation(() => undefined);

        const result = await cancelOrder("order1");

        expect(result).toMatchObject({ ok: false });
        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(after).not.toHaveBeenCalled();
    });

    it("refuses an order already completed", async () => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...PAID_ORDER, status: "completed" });

        await expect(cancelOrder("order1")).resolves.toMatchObject({ ok: false });
        expect(refundOrderPayment).not.toHaveBeenCalled();
    });
});

describe("advanceOrderStatus", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("emails the customer when the order becomes ready", async () => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ status: "preparing" });
        (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

        await expect(advanceOrderStatus("order1")).resolves.toEqual({ ok: true });
        expect(prisma.order.updateMany).toHaveBeenCalledWith({ where: { id: "order1", status: "preparing" }, data: { status: "ready" } });
        expect(after).toHaveBeenCalledTimes(1);
    });

    it("emails the customer when preparation starts", async () => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ status: "received" });
        (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

        await advanceOrderStatus("order1");
        expect(prisma.order.updateMany).toHaveBeenCalledWith({ where: { id: "order1", status: "received" }, data: { status: "preparing" } });
        expect(after).toHaveBeenCalledTimes(1);
    });

    it("sends nothing when the order is picked up or delivered", async () => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ status: "ready" });
        (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

        await advanceOrderStatus("order1");
        expect(after).not.toHaveBeenCalled();
    });
});
