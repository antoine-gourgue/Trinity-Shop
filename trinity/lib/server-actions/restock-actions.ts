"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { AccessDeniedError, requireBackOffice } from "@/services/auth/guards";
import { bestBeforeFromDay, daysLeft } from "@/lib/anti-gaspi";
import { addLot } from "@/lib/stock-lots";
import { expectedDelivery } from "@/lib/restock";
import { isBarcode } from "@/lib/barcode";
import type { AdminResult } from "@/lib/server-actions/admin-actions";

// Réassort du back-office : un compte magasin commande pour son magasin, le siège pour le magasin
// qu'il choisit. La commande est livrée le lendemain et devient un lot à sa réception.

const fail = (error: string): AdminResult => ({ ok: false, error });

const orderSchema = z.object({
  storeId: z.string().min(1).nullable(),
  productId: z.string().min(1, "Choisissez un produit."),
  quantity: z.number().int("Quantité invalide.").min(1, "Commandez au moins une unité.").max(2000, "2 000 unités au plus par commande."),
});

export type RestockInput = z.infer<typeof orderSchema>;

export async function orderRestock(input: RestockInput): Promise<AdminResult> {
  const access = await requireBackOffice();
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Commande invalide.");
  const storeId = access.store?.id ?? parsed.data.storeId;
  if (!storeId) return fail("Choisissez le magasin à réapprovisionner.");

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId }, select: { hidden: true } });
  if (!product) return fail("Produit introuvable.");
  if (product.hidden) return fail("Ce produit est retiré du catalogue.");

  await prisma.restockOrder.create({
    data: { storeId, productId: parsed.data.productId, quantity: parsed.data.quantity, expectedAt: expectedDelivery() },
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Commande du magasin du compte (toutes pour le siège), encore en livraison
async function openOrder(orderId: string) {
  const access = await requireBackOffice();
  const order = await prisma.restockOrder.findUnique({
    where: { id: orderId },
    select: { id: true, storeId: true, productId: true, quantity: true, status: true, product: { select: { shelfLifeDays: true } } },
  });
  if (order && access.store && order.storeId !== access.store.id) throw new AccessDeniedError();
  return order;
}

const receptionSchema = z.object({
  quantity: z.number().int("Quantité invalide.").min(1, "Indiquez la quantité reçue.").max(5000),
  bestBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date limite invalide."),
});

// Réception : les unités livrées entrent en stock comme un lot, avec la date lue sur les colis
export async function receiveRestock(orderId: string, input: z.infer<typeof receptionSchema>): Promise<AdminResult> {
  const order = await openOrder(orderId);
  if (!order) return fail("Commande introuvable.");
  if (order.status !== "ordered") return fail("Cette commande est déjà réceptionnée ou annulée.");
  const parsed = receptionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Réception invalide.");
  const bestBefore = bestBeforeFromDay(parsed.data.bestBefore);
  if (Number.isNaN(bestBefore.getTime()) || daysLeft(bestBefore) < 1) return fail("La date limite doit être postérieure à aujourd'hui.");

  const received = await prisma.$transaction(async (tx) => {
    // Conditionnel : deux réceptions simultanées ne créent qu'un lot
    const { count } = await tx.restockOrder.updateMany({
      where: { id: orderId, status: "ordered" },
      data: { status: "received", receivedAt: new Date(), receivedQuantity: parsed.data.quantity },
    });
    if (count === 0) return false;
    await addLot(tx, {
      storeId: order.storeId,
      productId: order.productId,
      quantity: parsed.data.quantity,
      bestBefore,
      shelfLife: order.product.shelfLifeDays,
      restockOrderId: orderId,
    });
    return true;
  });
  if (!received) return fail("Cette commande a déjà été réceptionnée.");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function cancelRestock(orderId: string): Promise<AdminResult> {
  const order = await openOrder(orderId);
  if (!order) return fail("Commande introuvable.");
  const { count } = await prisma.restockOrder.updateMany({ where: { id: orderId, status: "ordered" }, data: { status: "cancelled" } });
  if (count === 0) return fail("Cette commande est déjà réceptionnée ou annulée.");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export interface RestockProductOption {
  id: string;
  name: string;
  netContent: string | null;
  picture: string;
  barCode: string;
  // Stock du magasin choisi, null tant que le siège n'a pas choisi de magasin
  stock: number | null;
}

// Produits à commander : recherche par nom, marque ou code-barres, avec le stock du magasin
export async function searchRestockProducts(query: string, storeId: string | null): Promise<RestockProductOption[]> {
  const access = await requireBackOffice();
  const store = access.store?.id ?? storeId;
  const search = query.trim();
  if (search.length < 2) return [];

  const products = await prisma.product.findMany({
    where: {
      hidden: false,
      ...(isBarcode(search)
        ? { barCode: BigInt(search) }
        : { OR: [{ name: { contains: search, mode: "insensitive" } }, { brand: { name: { contains: search, mode: "insensitive" } } }] }),
    },
    orderBy: { name: "asc" },
    take: 8,
    select: {
      id: true,
      name: true,
      netContent: true,
      picture: true,
      barCode: true,
      stocks: store ? { where: { storeId: store }, select: { quantity: true } } : false,
    },
  });
  return products.map(({ barCode, stocks, ...product }) => ({
    ...product,
    barCode: barCode.toString(),
    stock: store ? (stocks?.[0]?.quantity ?? 0) : null,
  }));
}
