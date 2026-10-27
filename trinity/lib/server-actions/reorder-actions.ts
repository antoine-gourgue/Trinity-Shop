"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { storeForOrder } from "@/lib/stores";
import { storeStockMap } from "@/lib/stock";

export type ReorderResult = { ok: true; added: number; skipped: string[] } | { ok: false; error: string };

// Remet dans le panier actif les articles d'une commande passée, dans la limite du stock du magasin
// du client (celui de la commande s'il n'en a pas choisi) ;
// les produits retirés du catalogue ou épuisés sont signalés au lieu d'être ajoutés
export async function reorder(orderId: string): Promise<ReorderResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Connectez-vous pour racheter une commande." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      storeId: true,
      cart: {
        select: {
          productsInCart: {
            orderBy: { createdAt: "asc" },
            select: {
              quantity: true,
              product: { select: { id: true, name: true, hidden: true } },
            },
          },
        },
      },
    },
  });
  if (!order || order.userId !== userId) return { ok: false, error: "Commande introuvable." };

  const storeId = (await storeForOrder(userId)) ?? order.storeId;
  const items = order.cart.productsInCart;
  const stock = storeId ? await storeStockMap(storeId, items.map(({ product }) => product.id)) : new Map<string, number>();

  const cart =
    (await prisma.cart.findFirst({ where: { userId, archived: false }, include: { productsInCart: true } })) ??
    (await prisma.cart.create({ data: { userId }, include: { productsInCart: true } }));

  let added = 0;
  const skipped: string[] = [];
  for (const { quantity, product } of items) {
    const inCart = cart.productsInCart.find((item) => item.productId === product.id);
    const available = (stock.get(product.id) ?? 0) - (inCart?.quantity ?? 0);
    const wanted = Math.min(quantity, available);
    if (product.hidden || wanted <= 0) {
      skipped.push(product.name);
      continue;
    }

    if (inCart) {
      await prisma.productInCart.update({ where: { id: inCart.id }, data: { quantity: inCart.quantity + wanted } });
    } else {
      await prisma.productInCart.create({ data: { cartId: cart.id, productId: product.id, quantity: wanted } });
    }
    added += wanted;
    if (wanted < quantity) skipped.push(`${product.name} (${wanted} sur ${quantity})`);
  }

  return { ok: true, added, skipped };
}
