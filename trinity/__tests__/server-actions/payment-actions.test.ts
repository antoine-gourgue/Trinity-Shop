/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { checkAvailability } from "@/lib/orders/place-order";
import { stripeClient } from "@/lib/payments/stripe";
import { startCheckout, type StartCheckoutInput } from "@/lib/server-actions/payment-actions";
import { cartAntiGaspi } from "@/lib/anti-gaspi-offers";

jest.mock("@/lib/prisma", () => ({
    cart: { findFirst: jest.fn() },
    address: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    // Prospectus du magasin : aucun en cours par défaut
    prospectusItem: { findMany: jest.fn().mockResolvedValue([]) },
    // Prix payés, figés sur les lignes du panier
    productInCart: { update: jest.fn((args: unknown) => args) },
    $transaction: jest.fn(async (operations: unknown[]) => operations),
}));

jest.mock("@/lib/payments/stripe", () => ({
    ...jest.requireActual<typeof import("@/lib/payments/stripe")>("@/lib/payments/stripe"),
    stripeClient: jest.fn(),
}));

// Magasin du client (celui de son compte, ou choisi avant la connexion)
jest.mock("@/lib/stores", () => ({
    storeForOrder: jest.fn(async () => "store1"),
}));

// Articles anti-gaspi du panier : aucun par défaut
jest.mock("@/lib/anti-gaspi-offers", () => ({ cartAntiGaspi: jest.fn() }));

jest.mock("@/lib/orders/place-order", () => ({
    ...jest.requireActual<typeof import("@/lib/orders/place-order")>("@/lib/orders/place-order"),
    checkAvailability: jest.fn(),
}));

// Paramètres de la session lus tels quels : on vérifie leur forme avec toMatchObject
const sessionsCreate = jest.fn<Promise<{ url: string | null }>, [unknown]>();
const couponsCreate = jest.fn();
const fakeStripe = { checkout: { sessions: { create: sessionsCreate } }, coupons: { create: couponsCreate } };

const INPUT: StartCheckoutInput = {
    pickupSlot: "2099-06-02_10",
    fulfillment: "delivery",
    shippingAddressId: "address1",
    loyaltyVouchers: 1,
    returnPath: "/cart/paiement?creneau=2099-06-02_10&mode=livraison&adresse=address1",
};

const CART = {
    id: "cart1",
    productsInCart: [
        { id: "line1", productId: "p1", quantity: 2, product: { name: "Lait", price: 1190, picture: "/products/1.jpg" } },
        { id: "line2", productId: "p2", quantity: 1, product: { name: "Café", price: 4590, picture: "/products/2.jpg" } },
    ],
};

describe("startCheckout", () => {
    beforeEach(() => {
        (stripeClient as jest.Mock).mockReturnValue(fakeStripe);
        (auth as jest.Mock).mockResolvedValue({ user: { id: "user1", email: "jane@example.com" } });
        (prisma.cart.findFirst as jest.Mock).mockResolvedValue(CART);
        (prisma.address.findUnique as jest.Mock).mockResolvedValue({ userId: "user1" });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ loyaltyNumber: "1234", loyaltyPoints: 250 });
        (checkAvailability as jest.Mock).mockResolvedValue(null);
        (cartAntiGaspi as jest.Mock).mockResolvedValue({ discount: 0, allocations: [] });
        couponsCreate.mockResolvedValue({ id: "coupon1" });
        sessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("keeps the simulated payment when Stripe is not configured", async () => {
        (stripeClient as jest.Mock).mockReturnValue(null);

        await expect(startCheckout(INPUT)).resolves.toEqual({ mode: "simulated" });
        expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it("sends the cart, the delivery fee and the loyalty discount to Stripe", async () => {
        await expect(startCheckout(INPUT)).resolves.toEqual({ mode: "stripe", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
        // Disponibilités vérifiées dans le drive du client
        expect(checkAvailability).toHaveBeenCalledWith("cart1", expect.any(Date), "store1");

        // Bon de 5 € en remise, livraison de 5,90 € (articles sous 60 €), prix en centimes
        expect(couponsCreate).toHaveBeenCalledWith({ amount_off: 500, currency: "eur", duration: "once", name: "Bons Carte Trinity" });
        const [params] = sessionsCreate.mock.calls[0];
        expect(params).toMatchObject({
            mode: "payment",
            customer_email: "jane@example.com",
            discounts: [{ coupon: "coupon1" }],
            line_items: [
                { quantity: 2, price_data: { currency: "eur", unit_amount: 119, product_data: { name: "Lait" } } },
                { quantity: 1, price_data: { currency: "eur", unit_amount: 459, product_data: { name: "Café" } } },
                { quantity: 1, price_data: { currency: "eur", unit_amount: 590, product_data: { name: "Livraison à domicile" } } },
            ],
            metadata: {
                userId: "user1",
                cartId: "cart1",
                storeId: "store1",
                fulfillment: "delivery",
                shippingAddressId: "address1",
                loyaltyVouchers: "1",
                antiGaspiDiscount: "0",
            },
            success_url: "http://localhost:3000/api/payments/stripe/confirm?session_id={CHECKOUT_SESSION_ID}",
            cancel_url: `http://localhost:3000${INPUT.returnPath}`,
        });
    });

    it("charges the store prospectus price and freezes the prices paid on the cart lines", async () => {
        // Lait à 1,19 € au catalogue, 0,99 € dans le prospectus en cours du drive
        (prisma.prospectusItem.findMany as unknown as jest.Mock).mockResolvedValueOnce([
            { productId: "p1", price: 990, prospectus: { id: "prospectus1", endsAt: new Date("2099-01-01T00:00:00Z") } },
        ]);

        await startCheckout(INPUT);

        const [params] = sessionsCreate.mock.calls[0];
        expect(params).toMatchObject({
            line_items: [
                { quantity: 2, price_data: { unit_amount: 99, product_data: { name: "Lait" } } },
                { quantity: 1, price_data: { unit_amount: 459, product_data: { name: "Café" } } },
                { quantity: 1, price_data: { unit_amount: 590, product_data: { name: "Livraison à domicile" } } },
            ],
        });
        // La commande reprendra exactement ces montants à la confirmation du paiement
        expect(prisma.productInCart.update).toHaveBeenCalledWith({ where: { id: "line1" }, data: { unitPrice: 990 } });
        expect(prisma.productInCart.update).toHaveBeenCalledWith({ where: { id: "line2" }, data: { unitPrice: 4590 } });
    });

    it("adds the anti-waste discount to the loyalty vouchers in a single Stripe coupon", async () => {
        (cartAntiGaspi as jest.Mock).mockResolvedValue({ discount: 1190, allocations: [{ productId: "p1", lotId: "lot1", units: 2, percent: 50, discount: 1190 }] });

        await startCheckout(INPUT);

        // Lots du drive du client, encore bons au créneau choisi
        expect(cartAntiGaspi).toHaveBeenCalledWith("user1", "store1", expect.any(Date));
        expect(couponsCreate).toHaveBeenCalledWith({ amount_off: 619, currency: "eur", duration: "once", name: "Bons Carte Trinity et Anti-gaspi" });
        const [params] = sessionsCreate.mock.calls[0];
        expect(params).toMatchObject({ metadata: { antiGaspiDiscount: "1190" } });
    });

    it("refuses to charge a cart that can no longer be prepared", async () => {
        (checkAvailability as jest.Mock).mockResolvedValue({ code: "out_of_stock", products: ["Lait"] });

        const result = await startCheckout(INPUT);

        expect(result).toEqual({ mode: "error", error: "Stock insuffisant pour : Lait. Modifiez ces articles dans votre panier." });
        expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it("refuses a delivery address of another customer", async () => {
        (prisma.address.findUnique as jest.Mock).mockResolvedValue({ userId: "someone-else" });

        await expect(startCheckout(INPUT)).resolves.toMatchObject({ mode: "error" });
        expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it("refuses vouchers the customer cannot afford", async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ loyaltyNumber: "1234", loyaltyPoints: 50 });

        await expect(startCheckout(INPUT)).resolves.toEqual({
            mode: "error",
            error: "Votre solde Carte Trinity ne couvre plus ces bons de réduction.",
        });
    });
});
