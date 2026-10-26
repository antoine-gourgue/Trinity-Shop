import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import {
    AccessDeniedError,
    canAccessAddress,
    canAccessOrder,
    canAccessUser,
    isAdmin,
    requireAdmin,
    requireUserAccess,
} from "@/services/auth/guards";

jest.mock("@/lib/prisma", () => ({
    user: { findUnique: jest.fn() },
    order: { findUnique: jest.fn() },
    cart: { findUnique: jest.fn() },
    address: { findUnique: jest.fn() },
}));

// Session de l'utilisateur « alice » ; son rôle est relu en base
function signInAs(id: string | null, role: "Customer" | "Admin" = "Customer") {
    (auth as jest.Mock).mockResolvedValue(id ? { user: { id } } : null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(id ? { id, role } : null);
}

describe("guards", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("refuses everything without a session", async () => {
        signInAs(null);
        expect(await isAdmin()).toBe(false);
        expect(await canAccessUser("alice")).toBe(false);
        expect(await canAccessOrder("order1")).toBe(false);
        expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });

    it("lets a customer reach their own account only", async () => {
        signInAs("alice");
        expect(await canAccessUser("alice")).toBe(true);
        expect(await canAccessUser("bob")).toBe(false);
        expect(await isAdmin()).toBe(false);
    });

    it("checks the owner of orders and addresses", async () => {
        signInAs("alice");
        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ userId: "alice" });
        expect(await canAccessOrder("order1")).toBe(true);

        (prisma.order.findUnique as jest.Mock).mockResolvedValue({ userId: "bob" });
        expect(await canAccessOrder("order2")).toBe(false);

        (prisma.address.findUnique as jest.Mock).mockResolvedValue(null);
        expect(await canAccessAddress("missing")).toBe(false);
    });

    it("lets an admin reach any resource", async () => {
        signInAs("root", "Admin");
        expect(await isAdmin()).toBe(true);
        expect(await canAccessUser("bob")).toBe(true);
        expect(await canAccessOrder("order2")).toBe(true);
        expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });

    it("throws an AccessDeniedError for server actions", async () => {
        signInAs("alice");
        await expect(requireAdmin()).rejects.toBeInstanceOf(AccessDeniedError);
        await expect(requireUserAccess("bob")).rejects.toBeInstanceOf(AccessDeniedError);
        await expect(requireUserAccess("alice")).resolves.toBeUndefined();
    });

    it("reads the role from the database, not from the session", async () => {
        (auth as jest.Mock).mockResolvedValue({ user: { id: "alice", role: "Admin" } });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "alice", role: "Customer" });
        expect(await isAdmin()).toBe(false);
    });
});
