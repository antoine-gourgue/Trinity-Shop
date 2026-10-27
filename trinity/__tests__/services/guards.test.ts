import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import {
    AccessDeniedError,
    canAccessAddress,
    canAccessOrder,
    canAccessUser,
    backOfficeAccess,
    isAdmin,
    requireAdmin,
    requireOrderManagement,
    requireStockManagement,
    requireUserAccess,
} from "@/services/auth/guards";

jest.mock("@/lib/prisma", () => ({
    user: { findUnique: jest.fn() },
    order: { findUnique: jest.fn() },
    cart: { findUnique: jest.fn() },
    address: { findUnique: jest.fn() },
    storeStock: { findUnique: jest.fn() },
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

    describe("comptes magasin", () => {
        const BAYONNE = { id: "store-bayonne", slug: "bayonne", name: "Trinity Bayonne" };

        // Compte du magasin de Bayonne : le rôle et le magasin sont relus en base
        function signInAsStore() {
            (auth as jest.Mock).mockResolvedValue({ user: { id: "bayonne-team" } });
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "bayonne-team", role: "StoreManager", storeId: BAYONNE.id, store: BAYONNE });
        }

        it("opens the back-office of its own store only", async () => {
            signInAsStore();
            await expect(backOfficeAccess()).resolves.toEqual({ userId: "bayonne-team", store: BAYONNE });
            expect(await isAdmin()).toBe(false);
        });

        it("manages the orders and stock of its store, not those of another one", async () => {
            signInAsStore();
            (prisma.order.findUnique as jest.Mock).mockResolvedValue({ storeId: "store-bayonne" });
            await expect(requireOrderManagement("order1")).resolves.toMatchObject({ store: BAYONNE });

            (prisma.order.findUnique as jest.Mock).mockResolvedValue({ storeId: "store-pau" });
            await expect(requireOrderManagement("order2")).rejects.toBeInstanceOf(AccessDeniedError);

            (prisma.storeStock.findUnique as jest.Mock).mockResolvedValue({ storeId: "store-pau" });
            await expect(requireStockManagement("stock1")).rejects.toBeInstanceOf(AccessDeniedError);
        });

        it("reaches the invoice of its store's orders", async () => {
            signInAsStore();
            (prisma.order.findUnique as jest.Mock).mockResolvedValue({ userId: "jane", storeId: "store-bayonne" });
            expect(await canAccessOrder("order1")).toBe(true);

            (prisma.order.findUnique as jest.Mock).mockResolvedValue({ userId: "jane", storeId: "store-pau" });
            expect(await canAccessOrder("order2")).toBe(false);
        });

        it("keeps customers out of the back-office", async () => {
            signInAs("alice");
            await expect(backOfficeAccess()).resolves.toBeNull();
            await expect(requireOrderManagement("order1")).rejects.toBeInstanceOf(AccessDeniedError);
        });

        it("gives the head office every store", async () => {
            signInAs("root", "Admin");
            await expect(backOfficeAccess()).resolves.toEqual({ userId: "root", store: null });
            await expect(requireOrderManagement("order1")).resolves.toEqual({ userId: "root", store: null });
            expect(prisma.order.findUnique).not.toHaveBeenCalled();
        });
    });
});
