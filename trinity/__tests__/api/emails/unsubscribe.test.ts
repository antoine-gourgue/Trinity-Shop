/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { GET, POST } from "@/app/api/emails/unsubscribe/route";
import { unsubscribeSignature } from "@/lib/email-preferences";
import { buildRequest } from "@/test-utils/requests";

jest.mock("@/lib/prisma", () => ({ user: { updateMany: jest.fn() } }));

describe("/api/emails/unsubscribe", () => {
    beforeEach(() => {
        process.env.NEXTAUTH_SECRET = "test-secret";
    });

    afterEach(() => {
        delete process.env.AUTH_SECRET;
        jest.clearAllMocks();
    });

    it("turns reminders off with a valid signed link", async () => {
        const response = await GET(buildRequest(`/api/emails/unsubscribe?u=user1&s=${unsubscribeSignature("user1")}`));

        expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "user1" }, data: { cartReminders: false } });
        expect(response.headers.get("location")).toBe("http://localhost/legal/desabonnement");
    });

    it("refuses a link signed for another account", async () => {
        const response = await GET(buildRequest(`/api/emails/unsubscribe?u=user2&s=${unsubscribeSignature("user1")}`));

        expect(prisma.user.updateMany).not.toHaveBeenCalled();
        expect(response.headers.get("location")).toBe("http://localhost/legal/desabonnement?erreur=1");
    });

    it("signs with AUTH_SECRET when NEXTAUTH_SECRET is not set, as NextAuth does", async () => {
        delete process.env.NEXTAUTH_SECRET;
        process.env.AUTH_SECRET = "auth-secret";

        const response = await GET(buildRequest(`/api/emails/unsubscribe?u=user1&s=${unsubscribeSignature("user1")}`));

        expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
        expect(response.headers.get("location")).toBe("http://localhost/legal/desabonnement");
    });

    it("answers the one-click unsubscribe of mail clients", async () => {
        const response = await POST(buildRequest(`/api/emails/unsubscribe?u=user1&s=${unsubscribeSignature("user1")}`, { method: "POST" }));

        expect(response.status).toBe(200);
        expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
    });
});
