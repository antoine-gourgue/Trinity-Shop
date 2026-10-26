/**
 * @jest-environment node
 */
import { GET } from "@/app/api/cron/maintenance/route";
import { expirePromotions } from "@/lib/promotions";
import { purgeExpiredRateLimits } from "@/lib/rate-limit";
import { buildRequest } from "@/test-utils/requests";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/promotions", () => ({ expirePromotions: jest.fn() }));
jest.mock("@/lib/rate-limit", () => ({ purgeExpiredRateLimits: jest.fn() }));

function cronRequest(authorization?: string) {
    const request = buildRequest("/api/cron/maintenance");
    if (authorization) request.headers.set("authorization", authorization);
    return request;
}

describe("GET /api/cron/maintenance", () => {
    const previous = process.env.CRON_SECRET;

    beforeEach(() => {
        process.env.CRON_SECRET = "cron-test-secret";
        (expirePromotions as jest.Mock).mockResolvedValue(["p1"]);
        (purgeExpiredRateLimits as jest.Mock).mockResolvedValue({ count: 4 });
    });

    afterEach(() => {
        process.env.CRON_SECRET = previous;
        jest.clearAllMocks();
    });

    it("refuses calls without the cron secret", async () => {
        const response = await GET(cronRequest("Bearer wrong"));

        expect(response.status).toBe(401);
        expect(expirePromotions).not.toHaveBeenCalled();
    });

    it("refuses every call when no secret is configured", async () => {
        delete process.env.CRON_SECRET;

        expect((await GET(cronRequest("Bearer "))).status).toBe(401);
    });

    it("ends promotions and purges rate limits", async () => {
        const response = await GET(cronRequest("Bearer cron-test-secret"));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ endedPromotions: 1, purgedRateLimits: 4 });
    });
});
