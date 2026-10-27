/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { FavoritePromosEmail } from "@/components/emails/favorite-promos-email";
import { findFavoritePromoAlerts, sendFavoritePromoAlerts } from "@/lib/favorite-promos";

jest.mock("@/lib/prisma", () => ({
    favorite: { findMany: jest.fn(), updateMany: jest.fn() },
}));

const send = jest.fn<Promise<{ error: null }>, [unknown]>();
jest.mock("resend", () => ({ Resend: jest.fn(() => ({ emails: { send } })) }));
jest.mock("@/components/emails/favorite-promos-email", () => ({ FavoritePromosEmail: jest.fn(() => null) }));

const NOW = new Date("2026-10-27T16:00:00Z");
const JANE = { id: "user1", email: "jane@example.com", firstName: "Jane" };
const BOB = { id: "user2", email: "bob@example.com", firstName: "Bob" };
const PICTURE = "https://images.openfoodfacts.org/images/products/325/622/423/4494/front_fr.jpg";

function favorite(user: typeof JANE, id: string, price: number, regularPrice: number | null) {
    return { user, product: { id, name: `Produit ${id}`, price, regularPrice, picture: PICTURE, promoEndsAt: new Date("2026-11-02T23:00:00Z") } };
}

describe("findFavoritePromoAlerts", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("looks for favourites on promotion not yet announced, for customers who accept alerts at a confirmed address", async () => {
        (prisma.favorite.findMany as jest.Mock).mockResolvedValue([]);

        await findFavoritePromoAlerts();

        expect(prisma.favorite.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    promoNotifiedAt: null,
                    product: { hidden: false, regularPrice: { not: null } },
                    user: { favoritePromos: true, emailVerified: { not: null } },
                },
            })
        );
    });

    it("groups the favourites by customer and skips prices that are not real discounts", async () => {
        (prisma.favorite.findMany as jest.Mock).mockResolvedValue([
            favorite(JANE, "p1", 990, 1290),
            favorite(JANE, "p2", 1500, 1500),
            favorite(JANE, "p3", 2490, 2990),
            favorite(BOB, "p1", 990, 1290),
        ]);

        const alerts = await findFavoritePromoAlerts();

        expect(alerts.map((alert) => [alert.user.id, alert.products.map((product) => product.id)])).toEqual([
            ["user1", ["p1", "p3"]],
            ["user2", ["p1"]],
        ]);
    });
});

describe("sendFavoritePromoAlerts", () => {
    const previousKey = process.env.RESEND_API_KEY;

    beforeEach(() => {
        process.env.RESEND_API_KEY = "re_test";
        process.env.NEXTAUTH_SECRET = "test-secret";
        (prisma.favorite.findMany as jest.Mock).mockResolvedValue([favorite(JANE, "p1", 990, 1290), favorite(JANE, "p3", 2490, 2990)]);
        send.mockResolvedValue({ error: null });
        jest.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    });

    afterEach(() => {
        process.env.RESEND_API_KEY = previousKey;
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it("marks the favourites, then sends one email with every promotion and a one-click unsubscribe", async () => {
        (prisma.favorite.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

        await expect(sendFavoritePromoAlerts(NOW)).resolves.toEqual({ candidates: 1, sent: 1 });
        expect(prisma.favorite.updateMany).toHaveBeenCalledWith({
            where: { userId: "user1", productId: { in: ["p1", "p3"] }, promoNotifiedAt: null },
            data: { promoNotifiedAt: NOW },
        });
        const [message] = send.mock.calls[0];
        expect(message).toMatchObject({
            to: ["jane@example.com"],
            subject: "Jane, 2 de vos favoris sont en promo",
            headers: { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        });
        const [props] = jest.mocked(FavoritePromosEmail).mock.calls[0];
        expect(props.items.map((item) => [item.name, item.price, item.regularPrice, item.endsOn])).toEqual([
            ["Produit p1", 990, 1290, "lundi 2 novembre"],
            ["Produit p3", 2490, 2990, "lundi 2 novembre"],
        ]);
        expect(props.unsubscribeUrl).toContain("t=favorite-promos");
    });

    it("sends nothing twice when the task runs again", async () => {
        (prisma.favorite.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

        await expect(sendFavoritePromoAlerts(NOW)).resolves.toEqual({ candidates: 1, sent: 0 });
        expect(send).not.toHaveBeenCalled();
    });

    it("does nothing without a Resend key", async () => {
        delete process.env.RESEND_API_KEY;

        await expect(sendFavoritePromoAlerts(NOW)).resolves.toEqual({ candidates: 0, sent: 0 });
        expect(prisma.favorite.findMany).not.toHaveBeenCalled();
    });
});
