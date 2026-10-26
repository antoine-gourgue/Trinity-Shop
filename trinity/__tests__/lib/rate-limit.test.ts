/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { clientIp, hitRateLimit } from "@/lib/rate-limit";

jest.mock("@/lib/prisma", () => ({
    rateLimit: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
    },
}));

const RULE = { limit: 3, windowMs: 60_000 };
const NOW = new Date("2026-10-26T10:00:00Z");

describe("hitRateLimit", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("opens a new window on the first attempt", async () => {
        (prisma.rateLimit.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(hitRateLimit("signin:a@b.fr", RULE, NOW)).resolves.toBe(true);

        const resetAt = new Date("2026-10-26T10:01:00Z");
        expect(prisma.rateLimit.upsert).toHaveBeenCalledWith({
            where: { key: "signin:a@b.fr" },
            create: { key: "signin:a@b.fr", count: 1, resetAt },
            update: { count: 1, resetAt },
        });
    });

    it("counts attempts inside the window", async () => {
        (prisma.rateLimit.findUnique as jest.Mock).mockResolvedValue({ count: 2, resetAt: new Date("2026-10-26T10:00:30Z") });

        await expect(hitRateLimit("signin:a@b.fr", RULE, NOW)).resolves.toBe(true);
        expect(prisma.rateLimit.update).toHaveBeenCalledWith({ where: { key: "signin:a@b.fr" }, data: { count: { increment: 1 } } });
    });

    it("refuses once the limit is reached", async () => {
        (prisma.rateLimit.findUnique as jest.Mock).mockResolvedValue({ count: 3, resetAt: new Date("2026-10-26T10:00:30Z") });

        await expect(hitRateLimit("signin:a@b.fr", RULE, NOW)).resolves.toBe(false);
        expect(prisma.rateLimit.update).not.toHaveBeenCalled();
    });

    it("starts over when the window has ended", async () => {
        (prisma.rateLimit.findUnique as jest.Mock).mockResolvedValue({ count: 3, resetAt: new Date("2026-10-26T09:59:00Z") });

        await expect(hitRateLimit("signin:a@b.fr", RULE, NOW)).resolves.toBe(true);
        expect(prisma.rateLimit.upsert).toHaveBeenCalled();
    });
});

describe("clientIp", () => {
    it("reads the first address set by the proxy", () => {
        expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
        expect(clientIp(new Headers())).toBe("local");
    });
});
