/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { confirmEmail, verificationUrl } from "@/lib/email-verification";
import { GET } from "@/app/api/account/verify-email/route";
import { buildRequest } from "@/test-utils/requests";

jest.mock("@/lib/prisma", () => ({
    user: { findUnique: jest.fn(), updateMany: jest.fn() },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("resend", () => ({ Resend: jest.fn() }));

const DAY = 86_400_000;
const NOW = new Date("2026-10-27T10:00:00Z");
const JANE = { id: "user1", email: "jane@example.com" };

// Paramètres du lien envoyé à Jane, tels que le site les recevra
function linkParams(user = JANE, sentAt = NOW.getTime()) {
    const url = new URL(verificationUrl(user, sentAt));
    return { u: url.searchParams.get("u") ?? "", x: url.searchParams.get("x") ?? "", s: url.searchParams.get("s") ?? "" };
}

describe("confirmEmail", () => {
    beforeEach(() => {
        process.env.NEXTAUTH_SECRET = "test-secret";
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: JANE.email, emailVerified: null });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("confirms the address of a valid link", async () => {
        const { u, x, s } = linkParams();

        await expect(confirmEmail(u, x, s, NOW)).resolves.toBe("verified");
        expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "user1", email: JANE.email }, data: { emailVerified: NOW } });
    });

    it("refuses a link once its 7 days are over", async () => {
        const { u, x, s } = linkParams();

        await expect(confirmEmail(u, x, s, new Date(NOW.getTime() + 8 * DAY))).resolves.toBe("expired");
        expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it("refuses a link sent before the address changed, or with a forged expiry", async () => {
        const { u, x, s } = linkParams({ ...JANE, email: "old@example.com" });
        await expect(confirmEmail(u, x, s, NOW)).resolves.toBe("invalid");

        const valid = linkParams();
        await expect(confirmEmail(valid.u, String(Number(valid.x) + 30 * DAY), valid.s, NOW)).resolves.toBe("invalid");
        await expect(confirmEmail(valid.u, "demain", valid.s, NOW)).resolves.toBe("invalid");
        expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it("keeps an address already confirmed as it is", async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: JANE.email, emailVerified: new Date("2026-10-20T08:00:00Z") });
        const { u, x, s } = linkParams();

        await expect(confirmEmail(u, x, s, NOW)).resolves.toBe("verified");
        expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });
});

describe("/api/account/verify-email", () => {
    beforeEach(() => {
        process.env.NEXTAUTH_SECRET = "test-secret";
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: JANE.email, emailVerified: null });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("shows the result of the confirmation", async () => {
        const { u, x, s } = linkParams(JANE, Date.now());

        const response = await GET(buildRequest(`/api/account/verify-email?u=${u}&x=${x}&s=${s}`));
        expect(response.headers.get("location")).toBe("http://localhost/legal/confirmation-email?statut=verified");

        const forged = await GET(buildRequest(`/api/account/verify-email?u=${u}&x=${x}&s=abc`));
        expect(forged.headers.get("location")).toBe("http://localhost/legal/confirmation-email?statut=invalid");
    });
});
