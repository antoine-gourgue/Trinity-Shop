"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { storeForOrder } from "@/lib/stores";
import { storeStockMap } from "@/lib/stock";

export type FavoriteResult = { ok: true; favorite: boolean } | { ok: false; error: "login" | "invalid" };

// Identifiants des produits favoris du client connecté (vide sans session)
export async function getMyFavoriteIds(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const favorites = await prisma.favorite.findMany({ where: { userId: session.user.id }, select: { productId: true } });
  return favorites.map((favorite) => favorite.productId);
}

// Ajoute le produit aux favoris, ou l'en retire s'il y était déjà
export async function toggleFavorite(productId: string): Promise<FavoriteResult> {
  const parsed = z.string().min(1).safeParse(productId);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "login" };

  const key = { userId_productId: { userId, productId: parsed.data } };
  const existing = await prisma.favorite.findUnique({ where: key, select: { userId: true } });
  if (existing) {
    await prisma.favorite.delete({ where: key });
  } else {
    const product = await prisma.product.findUnique({ where: { id: parsed.data }, select: { id: true, regularPrice: true } });
    if (!product) return { ok: false, error: "invalid" };
    // Déjà en promotion : le client la voit en l'ajoutant, inutile de l'en alerter ensuite
    const promoNotifiedAt = product.regularPrice === null ? null : new Date();
    await prisma.favorite.create({ data: { userId, productId: parsed.data, promoNotifiedAt } });
  }
  revalidatePath("/user/favoris");
  return { ok: true, favorite: !existing };
}

export type AddFavoritesResult =
  | { ok: true; added: number; alreadyInCart: number; unavailable: number }
  | { ok: false; error: "login" };

// « Tout ajouter au panier » : un exemplaire de chaque favori disponible dans le magasin du client
// qui n'y est pas encore. Les produits déjà au panier gardent leur quantité ; ceux en rupture sont
// signalés. Sans magasin choisi, le stock sera vérifié au paiement.
export async function addFavoritesToCart(): Promise<AddFavoritesResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "login" };

  const [favorites, cart, storeId] = await Promise.all([
    prisma.favorite.findMany({ where: { userId, product: { hidden: false } }, select: { productId: true } }),
    prisma.cart.findFirst({ where: { userId, archived: false }, select: { id: true, productsInCart: { select: { productId: true } } } }),
    storeForOrder(userId),
  ]);

  const inCart = new Set(cart?.productsInCart.map((item) => item.productId));
  const notInCart = favorites.filter((favorite) => !inCart.has(favorite.productId));
  const stock = storeId ? await storeStockMap(storeId, notInCart.map((favorite) => favorite.productId)) : null;
  const available = notInCart.filter((favorite) => !stock || (stock.get(favorite.productId) ?? 0) > 0);

  if (available.length > 0) {
    const cartId = cart?.id ?? (await prisma.cart.create({ data: { userId }, select: { id: true } })).id;
    await prisma.productInCart.createMany({
      data: available.map((favorite) => ({ cartId, productId: favorite.productId, quantity: 1 })),
    });
    revalidatePath("/cart");
  }

  return {
    ok: true,
    added: available.length,
    alreadyInCart: favorites.length - notInCart.length,
    unavailable: notInCart.length - available.length,
  };
}
