/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { after } from "next/server";
import { checkIn, handOverOrder } from "@/lib/server-actions/drive-actions";
import { arrivalSignature } from "@/lib/drive-links";
import { requireOrderManagement } from "@/services/auth/guards";

jest.mock("@/lib/prisma", () => ({ order: { findUnique: jest.fn(), updateMany: jest.fn() } }));
jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/services/auth/guards", () => ({ requireOrderManagement: jest.fn() }));
jest.mock("@/lib/order-emails", () => ({ sendOrderStatusEmail: jest.fn() }));

const READY = { userId: "user1", status: "ready", shippingAddressId: null, arrivedAt: null };

// Mise à jour envoyée pour l'arrivée
const update = () => {
    const [[call]] = (prisma.order.updateMany as unknown as jest.Mock<unknown, [{ where: unknown; data: Record<string, unknown> }]>).mock.calls;
    return call;
};

describe("checkIn", () => {
    beforeAll(() => {
        process.env.NEXTAUTH_SECRET = "test-secret";
    });

    beforeEach(() => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue(READY);
        (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
        (auth as jest.Mock).mockResolvedValue(null);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("records the arrival and the parking spot from the signed e-mail link", async () => {
        await expect(checkIn("order1", 4, arrivalSignature("order1"))).resolves.toEqual({ ok: true });

        expect(update().where).toEqual({ id: "order1", status: "ready" });
        expect(update().data.parkingSpot).toBe(4);
        expect(update().data.arrivedAt).toBeInstanceOf(Date);
    });

    it("lets the signed-in customer check in from the order page", async () => {
        (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });

        await expect(checkIn("order1", 2)).resolves.toEqual({ ok: true });
    });

    it("keeps the first arrival time when the customer changes spot", async () => {
        const arrivedAt = new Date("2026-10-27T09:00:00Z");
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...READY, arrivedAt });

        await checkIn("order1", 7, arrivalSignature("order1"));

        expect(update().data).toEqual({ parkingSpot: 7, arrivedAt });
    });

    it("refuses a link signed for another order, or someone else's order", async () => {
        await expect(checkIn("order1", 4, arrivalSignature("order2"))).resolves.toMatchObject({ ok: false });
        (auth as jest.Mock).mockResolvedValue({ user: { id: "intruder" } });
        await expect(checkIn("order1", 4)).resolves.toMatchObject({ ok: false });
        expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("waits until the order is ready, and only for a pickup", async () => {
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...READY, status: "preparing" });
        await expect(checkIn("order1", 4, arrivalSignature("order1"))).resolves.toMatchObject({ ok: false });

        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ ...READY, shippingAddressId: "address1" });
        await expect(checkIn("order1", 4, arrivalSignature("order1"))).resolves.toMatchObject({ ok: false });
        expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("refuses a spot that does not exist", async () => {
        await expect(checkIn("order1", 40, arrivalSignature("order1"))).resolves.toMatchObject({ ok: false });
        expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });
});

describe("handOverOrder", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("completes a ready pickup order and thanks the customer", async () => {
        (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

        await expect(handOverOrder("order1")).resolves.toEqual({ ok: true });

        expect(requireOrderManagement).toHaveBeenCalledWith("order1");
        expect(update().where).toEqual({ id: "order1", status: "ready", shippingAddressId: null });
        expect(update().data.status).toBe("completed");
        expect(update().data.completedAt).toBeInstanceOf(Date);
        expect(after).toHaveBeenCalledTimes(1);
    });

    it("changes nothing once the order has left the drive", async () => {
        (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

        await expect(handOverOrder("order1")).resolves.toMatchObject({ ok: false });
        expect(after).not.toHaveBeenCalled();
    });
});
