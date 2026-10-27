/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { findAbandonedCarts, sendCartReminders } from "@/lib/cart-reminders";

jest.mock("@/lib/prisma", () => ({
    cart: { findMany: jest.fn(), updateMany: jest.fn() },
}));

const send = jest.fn<Promise<{ error: null }>, [unknown]>();
jest.mock("resend", () => ({ Resend: jest.fn(() => ({ emails: { send } })) }));
jest.mock("@/components/emails/cart-reminder-email", () => ({ CartReminderEmail: jest.fn(() => null) }));

const NOW = new Date("2026-10-27T16:00:00Z");
const ITEM = { quantity: 2, updatedAt: new Date("2026-10-27T09:00:00Z"), product: { name: "Lait", price: 1190, picture: "https://images.openfoodfacts.org/images/products/325/622/423/4494/front_fr.jpg", hidden: false } };

function cart(reminderSentAt: Date | null) {
    return { id: "cart1", reminderSentAt, user: { id: "user1", email: "jane@example.com", firstName: "Jane" }, productsInCart: [ITEM] };
}

describe("findAbandonedCarts", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("looks for idle carts of customers who accept reminders at a confirmed address", async () => {
        (prisma.cart.findMany as jest.Mock).mockResolvedValue([]);

        await findAbandonedCarts(NOW);

        expect(prisma.cart.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    archived: false,
                    user: { cartReminders: true, emailVerified: { not: null } },
                    productsInCart: {
                        some: { updatedAt: { gte: new Date("2026-10-20T16:00:00Z") } },
                        none: { updatedAt: { gt: new Date("2026-10-27T13:00:00Z") } },
                    },
                },
            })
        );
    });

    it("keeps one reminder per change of the cart", async () => {
        (prisma.cart.findMany as jest.Mock).mockResolvedValue([
            cart(null),
            { ...cart(new Date("2026-10-27T12:00:00Z")), id: "already-reminded" },
            { ...cart(new Date("2026-10-26T12:00:00Z")), id: "changed-since" },
        ]);

        const carts = await findAbandonedCarts(NOW);
        expect(carts.map((c) => c.id)).toEqual(["cart1", "changed-since"]);
    });
});

describe("sendCartReminders", () => {
    const previousKey = process.env.RESEND_API_KEY;

    beforeEach(() => {
        process.env.RESEND_API_KEY = "re_test";
        process.env.NEXTAUTH_SECRET = "test-secret";
        (prisma.cart.findMany as jest.Mock).mockResolvedValue([cart(null)]);
        send.mockResolvedValue({ error: null });
        // Copie locale de la photo présente sur le site
        jest.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    });

    afterEach(() => {
        process.env.RESEND_API_KEY = previousKey;
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it("marks the cart, then emails the customer with a one-click unsubscribe", async () => {
        (prisma.cart.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

        await expect(sendCartReminders(NOW)).resolves.toEqual({ candidates: 1, sent: 1 });
        expect(prisma.cart.updateMany).toHaveBeenCalledWith({ where: { id: "cart1", reminderSentAt: null }, data: { reminderSentAt: NOW } });
        const [message] = send.mock.calls[0];
        expect(message).toMatchObject({
            to: ["jane@example.com"],
            subject: "Jane, votre panier vous attend",
            headers: { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        });
    });

    it("sends nothing twice when the task runs again", async () => {
        (prisma.cart.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

        await expect(sendCartReminders(NOW)).resolves.toEqual({ candidates: 1, sent: 0 });
        expect(send).not.toHaveBeenCalled();
    });

    it("does nothing without a Resend key", async () => {
        delete process.env.RESEND_API_KEY;

        await expect(sendCartReminders(NOW)).resolves.toEqual({ candidates: 0, sent: 0 });
        expect(prisma.cart.findMany).not.toHaveBeenCalled();
    });
});
