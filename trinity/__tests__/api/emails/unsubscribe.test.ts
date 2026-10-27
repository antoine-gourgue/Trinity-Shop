/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { GET, POST } from "@/app/api/emails/unsubscribe/route";
import { unsubscribeSignature, unsubscribeUrl } from "@/lib/email-preferences";
import { buildRequest } from "@/test-utils/requests";

jest.mock("@/lib/prisma", () => ({ user: { updateMany: jest.fn() } }));

const link = (userId: string, topic: string, signature: string) => `/api/emails/unsubscribe?u=${userId}&t=${topic}&s=${signature}`;

describe("/api/emails/unsubscribe", () => {
    beforeEach(() => {
        process.env.NEXTAUTH_SECRET = "test-secret";
    });

    afterEach(() => {
        delete process.env.AUTH_SECRET;
        jest.clearAllMocks();
    });

    it("turns cart reminders off with a valid signed link", async () => {
        const response = await GET(buildRequest(link("user1", "cart-reminders", unsubscribeSignature("user1", "cart-reminders"))));

        expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "user1" }, data: { cartReminders: false } });
        expect(response.headers.get("location")).toBe("http://localhost/legal/desabonnement?type=cart-reminders");
    });

    it("turns favourite promo alerts off with their own link", async () => {
        const response = await GET(buildRequest(link("user1", "favorite-promos", unsubscribeSignature("user1", "favorite-promos"))));

        expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "user1" }, data: { favoritePromos: false } });
        expect(response.headers.get("location")).toBe("http://localhost/legal/desabonnement?type=favorite-promos");
    });

    it("builds links the route accepts", () => {
        const url = new URL(unsubscribeUrl("user1", "favorite-promos"));

        expect(url.pathname).toBe("/api/emails/unsubscribe");
        expect(url.searchParams.get("t")).toBe("favorite-promos");
        expect(url.searchParams.get("s")).toBe(unsubscribeSignature("user1", "favorite-promos"));
    });

    it("reads a link without a type as a cart reminder link", async () => {
        await GET(buildRequest(`/api/emails/unsubscribe?u=user1&s=${unsubscribeSignature("user1", "cart-reminders")}`));

        expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "user1" }, data: { cartReminders: false } });
    });

    it("refuses a link signed for another account or another type of email", async () => {
        const otherAccount = await GET(buildRequest(link("user2", "cart-reminders", unsubscribeSignature("user1", "cart-reminders"))));
        await GET(buildRequest(link("user1", "favorite-promos", unsubscribeSignature("user1", "cart-reminders"))));
        await GET(buildRequest(link("user1", "newsletter", unsubscribeSignature("user1", "cart-reminders"))));

        expect(prisma.user.updateMany).not.toHaveBeenCalled();
        expect(otherAccount.headers.get("location")).toBe("http://localhost/legal/desabonnement?erreur=1");
    });

    it("signs with AUTH_SECRET when NEXTAUTH_SECRET is not set, as NextAuth does", async () => {
        delete process.env.NEXTAUTH_SECRET;
        process.env.AUTH_SECRET = "auth-secret";

        const response = await GET(buildRequest(link("user1", "cart-reminders", unsubscribeSignature("user1", "cart-reminders"))));

        expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
        expect(response.headers.get("location")).toBe("http://localhost/legal/desabonnement?type=cart-reminders");
    });

    it("answers the one-click unsubscribe of mail clients", async () => {
        const response = await POST(
            buildRequest(link("user1", "favorite-promos", unsubscribeSignature("user1", "favorite-promos")), { method: "POST" })
        );

        expect(response.status).toBe(200);
        expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
    });
});
