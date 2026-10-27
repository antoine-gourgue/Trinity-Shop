"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { currentStore } from "@/lib/current-store";
import { lotPricing } from "@/lib/anti-gaspi";
import { cartAntiGaspi } from "@/lib/anti-gaspi-offers";
import { parseSlotParam, slotToDate } from "@/lib/checkout";

export type AntiGaspiCartResult = { ok: true } | { ok: false; error: string };

// Ajoute au panier un article d'un lot anti-gaspi du magasin du client. La ligne du produit garde
// l'offre : les unités à date courte disponibles lui sont servies en premier, à prix réduit.
export async function addAntiGaspiToCart(lotId: string): Promise<AntiGaspiCartResult> {
  if (!z.string().min(1).safeParse(lotId).success) return { ok: false, error: "Offre introuvable." };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Connectez-vous pour profiter des offres anti-gaspi." };

  const [store, lot] = await Promise.all([
    currentStore(),
    prisma.antiGaspiLot.findUnique({
      where: { id: lotId },
      select: { id: true, storeId: true, productId: true, quantity: true, bestBefore: true, closedAt: true, product: { select: { price: true } } },
    }),
  ]);
  if (!lot || !lotPricing(lot, lot.product.price)) return { ok: false, error: "Cette offre anti-gaspi n'est plus disponible." };
  if (lot.storeId !== store?.id) return { ok: false, error: "Cette offre concerne un autre magasin que le vôtre." };

  const cart =
    (await prisma.cart.findFirst({ where: { userId, archived: false }, select: { id: true } })) ??
    (await prisma.cart.create({ data: { userId }, select: { id: true } }));
  const line = await prisma.productInCart.findFirst({ where: { cartId: cart.id, productId: lot.productId }, select: { id: true, quantity: true } });

  if (line) {
    // Pas plus d'articles que d'unités du lot pour un ajout depuis l'offre
    await prisma.productInCart.update({
      where: { id: line.id },
      data: { quantity: Math.min(line.quantity + 1, Math.max(line.quantity, lot.quantity)), antiGaspiLotId: lot.id },
    });
  } else {
    await prisma.productInCart.create({ data: { cartId: cart.id, productId: lot.productId, quantity: 1, antiGaspiLotId: lot.id } });
  }
  return { ok: true };
}

// Le client renonce à l'offre : l'article reste au panier, au prix normal
export async function removeAntiGaspiOffer(productId: string): Promise<AntiGaspiCartResult> {
  const session = await auth();
  if (!session?.user?.id || !z.string().min(1).safeParse(productId).success) return { ok: false, error: "Article introuvable." };
  await prisma.productInCart.updateMany({
    where: { productId, cart: { userId: session.user.id, archived: false } },
    data: { antiGaspiLotId: null },
  });
  return { ok: true };
}

// Remise anti-gaspi du panier pour le créneau choisi, affichée au paiement (recalculée à la commande)
export async function getAntiGaspiQuote(pickupSlot: string | null) {
  const session = await auth();
  if (!session?.user?.id) return { discount: 0, allocations: [] };
  const store = await currentStore();
  const slot = parseSlotParam(pickupSlot);
  return cartAntiGaspi(session.user.id, store?.id ?? null, slot ? slotToDate(slot) : null);
}
