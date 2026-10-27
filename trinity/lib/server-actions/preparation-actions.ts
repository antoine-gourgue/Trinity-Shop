"use server";

import { z } from "zod";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireOrderManagement } from "@/services/auth/guards";
import { lineOutcome, preparationSummary } from "@/lib/orders/preparation";
import { refundPreparation } from "@/lib/payments/refund";
import { sendOrderStatusEmail } from "@/lib/order-emails";

export type PreparationResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): PreparationResult => ({ ok: false, error });

// Une commande se prépare tant qu'elle n'est pas prête, retirée ou annulée
const OPEN: OrderStatus[] = ["received", "preparing"];
const CLOSED = "Cette commande n'est plus en préparation.";

// Ligne d'une commande, avec sa commande (un panier commandé ne porte qu'une commande)
async function orderLine(lineId: string) {
  const line = await prisma.productInCart.findUnique({
    where: { id: lineId },
    select: {
      id: true,
      quantity: true,
      allowSubstitute: true,
      preparedQuantity: true,
      productId: true,
      product: { select: { categories: { select: { categoryName: true } } } },
      cart: { select: { orders: { select: { id: true, status: true, storeId: true }, take: 1 } } },
    },
  });
  const order = line?.cart.orders[0];
  return line && order ? { line, order } : null;
}

// Premier article traité : la commande passe « en préparation » et le client est prévenu
async function startPreparation(order: { id: string; status: OrderStatus }) {
  if (order.status !== "received") return;
  const { count } = await prisma.order.updateMany({ where: { id: order.id, status: "received" }, data: { status: "preparing" } });
  if (count > 0) after(() => sendOrderStatusEmail(order.id, { status: "preparing" }));
}

// Quantité prélevée en rayon (de 0, article manquant, à la quantité commandée)
export async function setPreparedQuantity(lineId: string, prepared: number): Promise<PreparationResult> {
  const found = await orderLine(lineId);
  if (!found) return fail("Article introuvable.");
  const { line, order } = found;
  await requireOrderManagement(order.id);
  if (!OPEN.includes(order.status)) return fail(CLOSED);
  const parsed = z.number().int().min(0).max(line.quantity).safeParse(prepared);
  if (!parsed.success) return fail(`Indiquez une quantité entre 0 et ${line.quantity}.`);

  await prisma.productInCart.update({
    where: { id: lineId },
    // Tout est prélevé : plus besoin de remplaçant
    data: { preparedQuantity: parsed.data, ...(parsed.data === line.quantity && { substituteId: null }) },
  });
  await startPreparation(order);
  revalidatePath(`/admin/preparation/${order.id}`);
  return { ok: true };
}

export interface SubstituteOption {
  id: string;
  name: string;
  price: number;
  picture: string;
  netContent: string | null;
  stock: number;
}

// Produits équivalents en stock dans le magasin : même catégorie, prix le plus proche d'abord
export async function getSubstituteOptions(lineId: string): Promise<SubstituteOption[]> {
  const found = await orderLine(lineId);
  const storeId = found?.order.storeId;
  if (!found || !storeId) return [];
  const { line, order } = found;
  await requireOrderManagement(order.id);
  const missing = line.quantity - (line.preparedQuantity ?? line.quantity);
  if (missing <= 0) return [];

  const product = await prisma.product.findUnique({ where: { id: line.productId }, select: { price: true } });
  const candidates = await prisma.product.findMany({
    where: {
      id: { not: line.productId },
      hidden: false,
      categories: { some: { categoryName: { in: line.product.categories.map((c) => c.categoryName) } } },
      stocks: { some: { storeId, quantity: { gte: missing } } },
    },
    select: {
      id: true,
      name: true,
      price: true,
      picture: true,
      netContent: true,
      stocks: { where: { storeId }, select: { quantity: true } },
    },
    take: 40,
  });
  const reference = product?.price ?? 0;
  return candidates
    .map(({ stocks, ...candidate }) => ({ ...candidate, stock: stocks[0]?.quantity ?? 0 }))
    .sort((a, b) => Math.abs(a.price - reference) - Math.abs(b.price - reference))
    .slice(0, 6);
}

// Produit donné à la place de la quantité manquante (null pour le retirer), si le client l'accepte
export async function setSubstitute(lineId: string, substituteId: string | null): Promise<PreparationResult> {
  const found = await orderLine(lineId);
  if (!found) return fail("Article introuvable.");
  const { line, order } = found;
  await requireOrderManagement(order.id);
  if (!OPEN.includes(order.status)) return fail(CLOSED);
  if (!line.allowSubstitute) return fail("Le client a refusé les remplacements pour cet article.");

  if (substituteId) {
    const missing = line.quantity - (line.preparedQuantity ?? line.quantity);
    if (missing <= 0) return fail("Rien ne manque pour cet article.");
    const available = order.storeId
      ? await prisma.storeStock.findUnique({
          where: { storeId_productId: { storeId: order.storeId, productId: substituteId } },
          select: { quantity: true },
        })
      : null;
    if (substituteId === line.productId || (available?.quantity ?? 0) < missing) return fail("Ce produit n'est pas disponible en remplacement.");
  }

  await prisma.productInCart.update({ where: { id: lineId }, data: { substituteId } });
  revalidatePath(`/admin/preparation/${order.id}`);
  return { ok: true };
}

// Fin de la préparation : différence remboursée sur la carte, stock du magasin corrigé (rayon vide
// pour un article manquant, remplaçant décompté), commande prête et client prévenu
export async function finishPreparation(orderId: string): Promise<PreparationResult> {
  await requireOrderManagement(orderId);
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      storeId: true,
      stripeSessionId: true,
      loyaltyDiscount: true,
      cart: {
        select: {
          productsInCart: {
            select: {
              productId: true,
              quantity: true,
              preparedQuantity: true,
              allowSubstitute: true,
              substituteId: true,
              product: { select: { name: true, price: true } },
              substitute: { select: { name: true, price: true } },
            },
          },
        },
      },
    },
  });
  if (!order) return fail("Commande introuvable.");
  if (!OPEN.includes(order.status)) return fail(CLOSED);

  const lines = order.cart.productsInCart;
  const summary = preparationSummary(lines);
  if (!summary.done) return fail(`Il reste ${summary.pending} article${summary.pending > 1 ? "s" : ""} à traiter.`);
  // Jamais plus que ce que le client a payé pour ses articles (les bons fidélité en moins)
  const paid = lines.reduce((total, line) => total + line.product.price * line.quantity, 0) - order.loyaltyDiscount;
  const refund = Math.min(summary.refund, Math.max(0, paid));

  try {
    await refundPreparation(order.stripeSessionId, refund);
  } catch (error) {
    console.error("Remboursement de la préparation impossible :", error);
    return fail("Le remboursement Stripe a échoué : la préparation n'est pas validée. Réessayez dans un instant.");
  }

  const storeId = order.storeId;
  // La commande change d'état seulement si elle était encore en préparation ; sinon rien n'est modifié
  const finished = await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: { in: OPEN } },
      data: { status: "ready", preparedAt: new Date(), preparationRefund: refund },
    });
    if (count === 0) return false;
    if (!storeId) return true;

    for (const line of lines) {
      const { missing, substitute } = lineOutcome(line);
      if (missing === 0) continue;
      // Le rayon était vide : le stock affiché était faux
      await tx.storeStock.updateMany({ where: { storeId, productId: line.productId }, data: { quantity: 0 } });
      if (substitute && line.substituteId) {
        await tx.storeStock.updateMany({
          where: { storeId, productId: line.substituteId, quantity: { gte: missing } },
          data: { quantity: { decrement: missing } },
        });
      }
    }
    return true;
  });
  if (!finished) return fail("La commande a changé entre-temps : rechargez la page.");

  after(() => sendOrderStatusEmail(orderId, { status: "ready" }));
  revalidatePath("/admin", "layout");
  return { ok: true };
}
