/**
 * @jest-environment node
 */
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { placeOrder } from "@/lib/orders/place-order";
import { fulfillCheckoutSession, type PaidSession } from "@/lib/payments/fulfill";

jest.mock("@/lib/prisma", () => ({
    order: { findUnique: jest.fn() },
}));

jest.mock("@/lib/orders/place-order", () => ({
    placeOrder: jest.fn(),
}));

const refundsCreate = jest.fn();
const stripe = { refunds: { create: refundsCreate } };

const METADATA = {
    userId: "user1",
    cartId: "cart1",
    pickupSlot: "2099-06-02_10",
    fulfillment: "delivery",
    shippingAddressId: "address1",
    loyaltyVouchers: "1",
    returnPath: "/cart/paiement?creneau=2099-06-02_10",
};

function session(overrides: Partial<PaidSession> = {}): PaidSession {
    return { id: "cs_test_1", payment_status: "paid", metadata: METADATA, payment_intent: "pi_1", ...overrides };
}

describe("fulfillCheckoutSession", () => {
    beforeEach(() => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("does nothing for an unpaid session", async () => {
        const result = await fulfillCheckoutSession(stripe, session({ payment_status: "unpaid" }));

        expect(result).toMatchObject({ ok: false, reason: "unpaid" });
        expect(placeOrder).not.toHaveBeenCalled();
        expect(refundsCreate).not.toHaveBeenCalled();
    });

    it("returns the order already created for the session", async () => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: "order1", userId: "user1" });

        await expect(fulfillCheckoutSession(stripe, session())).resolves.toEqual({
            ok: true,
            orderId: "order1",
            userId: "user1",
            created: false,
        });
        expect(placeOrder).not.toHaveBeenCalled();
    });

    it("creates the order from the session metadata", async () => {
        (placeOrder as jest.Mock).mockResolvedValue({ ok: true, order: { id: "order2", userId: "user1" } });

        await expect(fulfillCheckoutSession(stripe, session())).resolves.toEqual({
            ok: true,
            orderId: "order2",
            userId: "user1",
            created: true,
        });
        expect(placeOrder).toHaveBeenCalledWith({
            userId: "user1",
            cartId: "cart1",
            pickupSlot: new Date("2099-06-02T08:00:00.000Z"),
            delivery: { shippingAddressId: "address1" },
            loyaltyVouchers: 1,
            stripeSessionId: "cs_test_1",
        });
    });

    it("refunds the payment when the order is refused", async () => {
        (placeOrder as jest.Mock).mockResolvedValue({ ok: false, error: { code: "out_of_stock", products: ["Lait"] } });

        const result = await fulfillCheckoutSession(stripe, session());

        expect(result).toMatchObject({ ok: false, reason: "out_of_stock" });
        expect(refundsCreate).toHaveBeenCalledWith({ payment_intent: "pi_1" }, { idempotencyKey: "refund-cs_test_1" });
    });

    it("refunds a session whose metadata cannot be read", async () => {
        const result = await fulfillCheckoutSession(stripe, session({ metadata: { userId: "user1" } }));

        expect(result).toMatchObject({ ok: false, reason: "invalid" });
        expect(placeOrder).not.toHaveBeenCalled();
        expect(refundsCreate).toHaveBeenCalledTimes(1);
    });

    it("returns the order created at the same time by the other confirmation", async () => {
        (placeOrder as jest.Mock).mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5.22.0" })
        );
        (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "order3", userId: "user1" });

        await expect(fulfillCheckoutSession(stripe, session())).resolves.toEqual({
            ok: true,
            orderId: "order3",
            userId: "user1",
            created: false,
        });
        expect(refundsCreate).not.toHaveBeenCalled();
    });
});
