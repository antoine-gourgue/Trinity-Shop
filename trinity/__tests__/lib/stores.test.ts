/**
 * @jest-environment node
 */
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { STORE_COOKIE, storeForOrder } from "@/lib/stores";
import { chooseStore } from "@/lib/server-actions/store-actions";

jest.mock("@/lib/prisma", () => ({
    user: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    store: { findUnique: jest.fn(), findMany: jest.fn() },
}));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const NANTES = { id: "store-nantes", slug: "nantes-beaujoire", name: "Trinity Nantes Beaujoire" };

// Cookies de la requête : le magasin choisi avant la connexion
function withStoreCookie(slug: string | null) {
    const jar = { get: jest.fn(() => (slug ? { name: STORE_COOKIE, value: slug } : undefined)), set: jest.fn() };
    (cookies as jest.Mock).mockResolvedValue(jar);
    return jar;
}

describe("storeForOrder", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("takes the store saved on the account first", async () => {
        withStoreCookie("rennes-epitech");
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ storeId: "store-nantes" });

        await expect(storeForOrder("user1")).resolves.toBe("store-nantes");
        expect(prisma.store.findUnique).not.toHaveBeenCalled();
    });

    it("saves on the account the store chosen before signing in", async () => {
        withStoreCookie("nantes-beaujoire");
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ storeId: null });
        (prisma.store.findUnique as jest.Mock).mockResolvedValue({ id: "store-nantes" });

        await expect(storeForOrder("user1")).resolves.toBe("store-nantes");
        expect(prisma.user.updateMany).toHaveBeenCalledWith({ where: { id: "user1", storeId: null }, data: { storeId: "store-nantes" } });
    });

    it("has no store when none was chosen", async () => {
        withStoreCookie(null);
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ storeId: null });

        await expect(storeForOrder("user1")).resolves.toBeNull();
        expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });
});

describe("chooseStore", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("keeps the store in a cookie and on the account of a signed-in customer", async () => {
        const jar = withStoreCookie(null);
        (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
        (prisma.store.findUnique as jest.Mock).mockResolvedValue(NANTES);

        await expect(chooseStore("nantes-beaujoire")).resolves.toEqual({ ok: true, store: NANTES });
        expect(jar.set).toHaveBeenCalledWith(STORE_COOKIE, "nantes-beaujoire", expect.objectContaining({ path: "/" }));
        expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user1" }, data: { storeId: "store-nantes" } });
    });

    it("only keeps the cookie for a visitor", async () => {
        const jar = withStoreCookie(null);
        (auth as jest.Mock).mockResolvedValue(null);
        (prisma.store.findUnique as jest.Mock).mockResolvedValue(NANTES);

        await chooseStore("nantes-beaujoire");
        expect(jar.set).toHaveBeenCalledTimes(1);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("refuses an unknown store", async () => {
        const jar = withStoreCookie(null);
        (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(chooseStore("atlantide")).resolves.toEqual({ ok: false, error: "Magasin inconnu." });
        expect(jar.set).not.toHaveBeenCalled();
    });
});
