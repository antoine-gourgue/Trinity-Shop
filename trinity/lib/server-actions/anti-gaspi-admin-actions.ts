"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { AccessDeniedError, requireBackOffice } from "@/services/auth/guards";
import { bestBeforeFromDay, daysLeft } from "@/lib/anti-gaspi";
import { isBarcode } from "@/lib/barcode";
import type { AdminResult } from "@/lib/server-actions/admin-actions";

// Lots anti-gaspi du back-office : un compte magasin gère les siens, le siège ceux de tout le réseau

const fail = (error: string): AdminResult => ({ ok: false, error });

// Une date plus lointaine n'a rien d'une date courte
const MAX_DAYS_AHEAD = 60;

const lotSchema = z.object({
  // Magasin du lot : choisi par le siège, imposé pour un compte magasin
  storeId: z.string().min(1).nullable(),
  productId: z.string().min(1, "Choisissez un produit."),
  quantity: z.number().int("Quantité invalide.").min(1, "Indiquez au moins une unité.").max(500, "500 unités au plus par lot."),
  bestBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date limite invalide."),
});

export type LotInput = z.infer<typeof lotSchema>;

// Déclare un lot à date courte : ses unités font partie du stock du magasin
export async function declareLot(input: LotInput): Promise<AdminResult> {
  const access = await requireBackOffice();
  const parsed = lotSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Lot invalide.");
  const { productId, quantity } = parsed.data;
  const storeId = access.store?.id ?? parsed.data.storeId;
  if (!storeId) return fail("Choisissez le magasin du lot.");

  const bestBefore = bestBeforeFromDay(parsed.data.bestBefore);
  const days = daysLeft(bestBefore);
  if (Number.isNaN(days) || days < 0) return fail("La date limite est déjà passée.");
  if (days > MAX_DAYS_AHEAD) return fail(`Un lot anti-gaspi a une date limite dans les ${MAX_DAYS_AHEAD} prochains jours.`);

  // Les lots ouverts ne dépassent jamais le stock du magasin
  const [stock, open] = await Promise.all([
    prisma.storeStock.findUnique({ where: { storeId_productId: { storeId, productId } }, select: { quantity: true } }),
    prisma.antiGaspiLot.aggregate({ where: { storeId, productId, closedAt: null }, _sum: { quantity: true } }),
  ]);
  const inLots = open._sum.quantity ?? 0;
  const available = (stock?.quantity ?? 0) - inLots;
  if (quantity > available) {
    return fail(
      available > 0
        ? `Le magasin n'a que ${available} unité${available > 1 ? "s" : ""} de ce produit hors lots anti-gaspi.`
        : "Ce produit n'a plus d'unités en stock à déclarer dans ce magasin."
    );
  }

  await prisma.antiGaspiLot.create({ data: { storeId, productId, quantity, initialQuantity: quantity, bestBefore } });
  revalidatePath("/admin/anti-gaspi");
  return { ok: true };
}

// Clôt un lot : les unités restantes sont données (association, banque alimentaire) ou jetées,
// et quittent le stock du magasin
export async function closeLot(lotId: string, outcome: "donated" | "wasted"): Promise<AdminResult> {
  const access = await requireBackOffice();
  if (outcome !== "donated" && outcome !== "wasted") return fail("Issue du lot invalide.");
  const lot = await prisma.antiGaspiLot.findUnique({ where: { id: lotId }, select: { storeId: true, productId: true, closedAt: true } });
  if (!lot) return fail("Lot introuvable.");
  if (access.store && lot.storeId !== access.store.id) throw new AccessDeniedError();
  if (lot.closedAt) return fail("Ce lot est déjà clos.");

  const closed = await prisma.$transaction(async (tx) => {
    // Quantité relue dans la transaction : une commande a pu prendre des unités entre-temps
    const current = await tx.antiGaspiLot.findUnique({ where: { id: lotId }, select: { quantity: true, closedAt: true } });
    if (!current || current.closedAt) return false;
    await tx.antiGaspiLot.update({
      where: { id: lotId },
      data: {
        quantity: 0,
        closedAt: new Date(),
        ...(outcome === "donated" ? { donatedQuantity: { increment: current.quantity } } : { wastedQuantity: { increment: current.quantity } }),
      },
    });
    const stock = await tx.storeStock.findUnique({
      where: { storeId_productId: { storeId: lot.storeId, productId: lot.productId } },
      select: { quantity: true },
    });
    if (stock && current.quantity > 0) {
      await tx.storeStock.update({
        where: { storeId_productId: { storeId: lot.storeId, productId: lot.productId } },
        data: { quantity: Math.max(0, stock.quantity - current.quantity) },
      });
    }
    return true;
  });
  if (!closed) return fail("Ce lot a changé entre-temps : rechargez la page.");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export interface LotProductOption {
  id: string;
  name: string;
  netContent: string | null;
  picture: string;
  barCode: string;
  // Stock du magasin choisi, null tant que le siège n'a pas choisi de magasin
  stock: number | null;
}

// Produits à déclarer : recherche par nom ou par code-barres, avec le stock du magasin
export async function searchLotProducts(query: string, storeId: string | null): Promise<LotProductOption[]> {
  const access = await requireBackOffice();
  const store = access.store?.id ?? storeId;
  const search = query.trim();
  if (search.length < 2) return [];

  const products = await prisma.product.findMany({
    where: {
      hidden: false,
      ...(isBarcode(search) ? { barCode: BigInt(search) } : { name: { contains: search, mode: "insensitive" } }),
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
