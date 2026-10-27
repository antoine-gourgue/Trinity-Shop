/**
 * @jest-environment node
 */
import Stripe from "stripe";
import { stripeClient } from "@/lib/payments/stripe";
import { refundOrderPayment, refundPreparation } from "@/lib/payments/refund";

jest.mock("@/lib/payments/stripe", () => ({ stripeClient: jest.fn(), toCents: (amount: number) => Math.round(amount / 10) }));

const retrieve = jest.fn();
const createRefund = jest.fn();

describe("refundOrderPayment", () => {
    beforeEach(() => {
        (stripeClient as jest.Mock).mockReturnValue({ checkout: { sessions: { retrieve } }, refunds: { create: createRefund } });
        retrieve.mockResolvedValue({ payment_intent: "pi_1", amount_total: 1347 });
        createRefund.mockResolvedValue({ amount: 1347 });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("refunds nothing for a simulated payment", async () => {
        await expect(refundOrderPayment(null)).resolves.toEqual({ refunded: false });
        expect(retrieve).not.toHaveBeenCalled();
    });

    it("refunds the whole Stripe payment once", async () => {
        await expect(refundOrderPayment("cs_test_1")).resolves.toEqual({ refunded: true, amount: 13470 });
        expect(createRefund).toHaveBeenCalledWith({ payment_intent: "pi_1" }, { idempotencyKey: "refund-order-cs_test_1" });
    });

    it("accepts a payment already refunded from the Stripe dashboard", async () => {
        createRefund.mockRejectedValue(
            new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", code: "charge_already_refunded", message: "Already refunded" })
        );

        await expect(refundOrderPayment("cs_test_1")).resolves.toEqual({ refunded: true, amount: 13470 });
    });

    it("fails when Stripe is not configured", async () => {
        (stripeClient as jest.Mock).mockReturnValue(null);

        await expect(refundOrderPayment("cs_test_1")).rejects.toThrow("Stripe n'est pas configuré");
    });
});

describe("refundPreparation", () => {
    beforeEach(() => {
        (stripeClient as jest.Mock).mockReturnValue({ checkout: { sessions: { retrieve } }, refunds: { create: createRefund } });
        retrieve.mockResolvedValue({ payment_intent: "pi_1", amount_total: 1347 });
        createRefund.mockImplementation(async ({ amount }: { amount: number }) => ({ amount }));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("refunds part of the payment once per order", async () => {
        await expect(refundPreparation("cs_test_1", 2490)).resolves.toEqual({ refunded: true, amount: 2490 });
        expect(createRefund).toHaveBeenCalledWith({ payment_intent: "pi_1", amount: 249 }, { idempotencyKey: "refund-preparation-cs_test_1" });
    });

    it("never refunds more than the amount charged", async () => {
        await refundPreparation("cs_test_1", 50000);
        expect(createRefund).toHaveBeenCalledWith(expect.objectContaining({ amount: 1347 }), expect.anything());
    });

    it("does nothing without a payment or an amount to refund", async () => {
        await expect(refundPreparation(null, 2490)).resolves.toEqual({ refunded: false });
        await expect(refundPreparation("cs_test_1", 0)).resolves.toEqual({ refunded: false });
        expect(createRefund).not.toHaveBeenCalled();
    });
});
