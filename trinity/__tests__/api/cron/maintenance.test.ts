/**
 * @jest-environment node
 */
import { GET } from "@/app/api/cron/maintenance/route";
import { expirePromotions } from "@/lib/promotions";
import { purgeExpiredRateLimits } from "@/lib/rate-limit";
import { autoReplenish, receiveOverdueRestocks, withdrawExpiredLots } from "@/lib/stock-maintenance";
import { buildRequest } from "@/test-utils/requests";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/promotions", () => ({ expirePromotions: jest.fn() }));
jest.mock("@/lib/rate-limit", () => ({ purgeExpiredRateLimits: jest.fn() }));
jest.mock("@/lib/stock-maintenance", () => ({ withdrawExpiredLots: jest.fn(), receiveOverdueRestocks: jest.fn(), autoReplenish: jest.fn() }));

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
        (withdrawExpiredLots as jest.Mock).mockResolvedValue(12);
        (receiveOverdueRestocks as jest.Mock).mockResolvedValue(3);
        (autoReplenish as jest.Mock).mockResolvedValue(40);
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

    it("ends promotions, purges rate limits and runs the nightly stock jobs", async () => {
        const response = await GET(cronRequest("Bearer cron-test-secret"));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            endedPromotions: 1,
            purgedRateLimits: 4,
            withdrawnLots: 12,
            receivedRestocks: 3,
            restockOrders: 40,
        });
    });
});
