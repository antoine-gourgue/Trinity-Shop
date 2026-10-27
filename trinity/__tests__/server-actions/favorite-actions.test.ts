/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { addFavoritesToCart, toggleFavorite } from "@/lib/server-actions/favorite-actions";
import { storeForOrder } from "@/lib/stores";

jest.mock("@/lib/prisma", () => ({
    favorite: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    product: { findUnique: jest.fn() },
    cart: { findFirst: jest.fn(), create: jest.fn() },
    productInCart: { createMany: jest.fn() },
    storeStock: { findMany: jest.fn() },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// Magasin du client (celui de son compte, ou choisi avant la connexion)
jest.mock("@/lib/stores", () => ({ storeForOrder: jest.fn() }));

const favorite = (productId: string) => ({ productId });
// Stock du magasin du client ; un produit absent n'y est pas référencé
const storeStock = (stocks: Record<string, number>) =>
    (prisma.storeStock.findMany as jest.Mock).mockResolvedValue(Object.entries(stocks).map(([productId, quantity]) => ({ productId, quantity })));

describe("addFavoritesToCart", () => {
    beforeEach(() => {
        (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
        (storeForOrder as jest.Mock).mockResolvedValue("store1");
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("adds one of each favourite available in the customer's store and missing from the cart", async () => {
        (prisma.favorite.findMany as jest.Mock).mockResolvedValue([favorite("milk"), favorite("bread"), favorite("coffee"), favorite("eggs")]);
        storeStock({ milk: 12, bread: 4, coffee: 0 });
        (prisma.cart.findFirst as jest.Mock).mockResolvedValue({ id: "cart1", productsInCart: [{ productId: "bread" }] });

        await expect(addFavoritesToCart()).resolves.toEqual({ ok: true, added: 1, alreadyInCart: 1, unavailable: 2 });
        expect(prisma.productInCart.createMany).toHaveBeenCalledWith({ data: [{ cartId: "cart1", productId: "milk", quantity: 1 }] });
        expect(prisma.storeStock.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { storeId: "store1", productId: { in: ["milk", "coffee", "eggs"] } } }));
        expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it("leaves the stock check to the payment when no store is chosen", async () => {
        (storeForOrder as jest.Mock).mockResolvedValue(null);
        (prisma.favorite.findMany as jest.Mock).mockResolvedValue([favorite("milk"), favorite("coffee")]);
        (prisma.cart.findFirst as jest.Mock).mockResolvedValue({ id: "cart1", productsInCart: [] });

        await expect(addFavoritesToCart()).resolves.toEqual({ ok: true, added: 2, alreadyInCart: 0, unavailable: 0 });
        expect(prisma.storeStock.findMany).not.toHaveBeenCalled();
    });

    it("opens a cart when the customer has none", async () => {
        (prisma.favorite.findMany as jest.Mock).mockResolvedValue([favorite("milk")]);
        storeStock({ milk: 12 });
        (prisma.cart.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.cart.create as jest.Mock).mockResolvedValue({ id: "new-cart" });

        await expect(addFavoritesToCart()).resolves.toEqual({ ok: true, added: 1, alreadyInCart: 0, unavailable: 0 });
        expect(prisma.cart.create).toHaveBeenCalledWith({ data: { userId: "user1" }, select: { id: true } });
        expect(prisma.productInCart.createMany).toHaveBeenCalledWith({ data: [{ cartId: "new-cart", productId: "milk", quantity: 1 }] });
    });

    it("asks to sign in without a session", async () => {
        (auth as jest.Mock).mockResolvedValue(null);

        await expect(addFavoritesToCart()).resolves.toEqual({ ok: false, error: "login" });
        expect(prisma.favorite.findMany).not.toHaveBeenCalled();
    });
});

describe("toggleFavorite", () => {
    beforeEach(() => {
        (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
        (prisma.favorite.findUnique as jest.Mock).mockResolvedValue(null);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("does not announce a promotion the customer saw when adding the favourite", async () => {
        (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: "milk", regularPrice: 1290 });

        await expect(toggleFavorite("milk")).resolves.toEqual({ ok: true, favorite: true });
        const [args] = (prisma.favorite.create as jest.Mock).mock.calls[0] as [{ data: { promoNotifiedAt: Date | null } }];
        expect(args.data.promoNotifiedAt).toBeInstanceOf(Date);
    });

    it("leaves the next promotion to announce for a product at its regular price", async () => {
        (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: "milk", regularPrice: null });

        await toggleFavorite("milk");
        expect(prisma.favorite.create).toHaveBeenCalledWith({ data: { userId: "user1", productId: "milk", promoNotifiedAt: null } });
    });
});
