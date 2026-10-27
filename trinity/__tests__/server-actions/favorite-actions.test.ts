/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { addFavoritesToCart, toggleFavorite } from "@/lib/server-actions/favorite-actions";

jest.mock("@/lib/prisma", () => ({
    favorite: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    product: { findUnique: jest.fn() },
    cart: { findFirst: jest.fn(), create: jest.fn() },
    productInCart: { createMany: jest.fn() },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const favorite = (productId: string, stock: number | null) => ({
    productId,
    product: { stock: stock === null ? null : { quantity: stock } },
});

describe("addFavoritesToCart", () => {
    beforeEach(() => {
        (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("adds one of each available favourite missing from the cart", async () => {
        (prisma.favorite.findMany as jest.Mock).mockResolvedValue([
            favorite("milk", 12),
            favorite("bread", 4),
            favorite("coffee", 0),
            favorite("eggs", null),
        ]);
        (prisma.cart.findFirst as jest.Mock).mockResolvedValue({ id: "cart1", productsInCart: [{ productId: "bread" }] });

        await expect(addFavoritesToCart()).resolves.toEqual({ ok: true, added: 1, alreadyInCart: 1, unavailable: 2 });
        expect(prisma.productInCart.createMany).toHaveBeenCalledWith({ data: [{ cartId: "cart1", productId: "milk", quantity: 1 }] });
        expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it("opens a cart when the customer has none", async () => {
        (prisma.favorite.findMany as jest.Mock).mockResolvedValue([favorite("milk", 12)]);
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
