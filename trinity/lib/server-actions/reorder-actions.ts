"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export type ReorderResult = { ok: true; added: number; skipped: string[] } | { ok: false; error: string };

// Remet dans le panier actif les articles d'une commande passée, dans la limite du stock ;
// les produits retirés du catalogue ou épuisés sont signalés au lieu d'être ajoutés
export async function reorder(orderId: string): Promise<ReorderResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Connectez-vous pour racheter une commande." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      cart: {
        select: {
          productsInCart: {
            orderBy: { createdAt: "asc" },
            select: {
              quantity: true,
              product: { select: { id: true, name: true, hidden: true, stock: { select: { quantity: true } } } },
            },
          },
        },
      },
    },
  });
  if (!order || order.userId !== userId) return { ok: false, error: "Commande introuvable." };

  const cart =
    (await prisma.cart.findFirst({ where: { userId, archived: false }, include: { productsInCart: true } })) ??
    (await prisma.cart.create({ data: { userId }, include: { productsInCart: true } }));

  let added = 0;
  const skipped: string[] = [];
  for (const { quantity, product } of order.cart.productsInCart) {
    const inCart = cart.productsInCart.find((item) => item.productId === product.id);
    const available = (product.stock?.quantity ?? 0) - (inCart?.quantity ?? 0);
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
