/**
 * @jest-environment node
 */
import Stripe from "stripe";
import { stripeClient } from "@/lib/payments/stripe";
import { refundOrderPayment } from "@/lib/payments/refund";

jest.mock("@/lib/payments/stripe", () => ({ stripeClient: jest.fn() }));

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
