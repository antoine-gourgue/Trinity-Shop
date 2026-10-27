import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { bestBeforeIn, markdownWindow } from "@/lib/shelf-life";

// Mouvements de stock par lots. Le stock d'un produit dans un magasin (StoreStock) reste la somme de
// ses lots ouverts : chaque fonction met les deux à jour, dans la transaction de l'appelant.

type Tx = Prisma.TransactionClient;

// Sortie d'unités d'un lot : vendues, retirées par une correction d'inventaire, données ou jetées
export type LotOutcome = "sold" | "adjusted" | "donated" | "wasted";

function outcomeIncrement(outcome: LotOutcome, units: number): Prisma.StockLotUpdateManyMutationInput {
  switch (outcome) {
    case "sold":
      return { soldQuantity: { increment: units } };
    case "adjusted":
      return { adjustedQuantity: { increment: units } };
    case "donated":
      return { donatedQuantity: { increment: units } };
    case "wasted":
      return { wastedQuantity: { increment: units } };
  }
}

export interface TakeFromLots {
  storeId: string;
  productId: string;
  quantity: number;
  outcome: LotOutcome;
  // Vente : dates les plus longues d'abord (le client reçoit les produits les plus frais) ;
  // correction d'inventaire : dates les plus courtes d'abord
  order: "freshest" | "oldest";
  // Ligne de commande servie, pour la traçabilité
  lineId?: string;
}

// Retire des unités des lots ouverts d'un produit ; renvoie le nombre d'unités réellement retirées
export async function takeFromLots(tx: Tx, { storeId, productId, quantity, outcome, order, lineId }: TakeFromLots) {
  if (quantity <= 0) return 0;
  const lots = await tx.stockLot.findMany({
    where: { storeId, productId, closedAt: null, quantity: { gt: 0 } },
    orderBy: [{ bestBefore: order === "freshest" ? "desc" : "asc" }, { createdAt: "asc" }],
    select: { id: true, quantity: true },
  });

  let remaining = quantity;
  for (const lot of lots) {
    if (remaining === 0) break;
    const units = Math.min(remaining, lot.quantity);
    // Conditionnel : une autre commande a pu prendre des unités entre-temps
    const { count } = await tx.stockLot.updateMany({
      where: { id: lot.id, quantity: { gte: units } },
      data: { quantity: { decrement: units }, ...outcomeIncrement(outcome, units) },
    });
    if (count === 0) continue;
    if (units === lot.quantity) {
      await tx.stockLot.updateMany({ where: { id: lot.id, quantity: 0, closedAt: null }, data: { closedAt: new Date() } });
    }
    if (lineId) await tx.lotAllocation.create({ data: { lineId, lotId: lot.id, quantity: units } });
    remaining -= units;
  }
  return quantity - remaining;
}

export interface NewLot {
  storeId: string;
  productId: string;
  quantity: number;
  bestBefore: Date;
  // Durée de conservation du produit : fenêtre anti-gaspi du lot
  shelfLife: number;
  restockOrderId?: string;
}

// Entrée d'un lot en stock (réception d'un réassort, correction d'inventaire)
export async function addLot(tx: Tx, { storeId, productId, quantity, bestBefore, shelfLife, restockOrderId }: NewLot) {
  const lot = await tx.stockLot.create({
    data: { storeId, productId, quantity, initialQuantity: quantity, bestBefore, markdownDays: markdownWindow(shelfLife), restockOrderId },
    select: { id: true },
  });
  await tx.storeStock.upsert({
    where: { storeId_productId: { storeId, productId } },
    create: { storeId, productId, quantity },
    update: { quantity: { increment: quantity } },
  });
  return lot;
}

export interface StockCount {
  storeId: string;
  productId: string;
  quantity: number;
  shelfLife: number;
  // Date des unités trouvées en plus, lue sur le produit ; sinon la date habituelle du produit
  bestBefore?: Date;
}

// Stock compté en rayon : les unités en trop sont retirées des dates les plus courtes, les unités
// trouvées en plus entrent comme un lot
export async function setStockQuantity(tx: Tx, { storeId, productId, quantity, shelfLife, bestBefore }: StockCount) {
  const stock = await tx.storeStock.findUnique({ where: { storeId_productId: { storeId, productId } }, select: { quantity: true } });
  const difference = quantity - (stock?.quantity ?? 0);
  if (difference > 0) {
    await addLot(tx, { storeId, productId, quantity: difference, bestBefore: bestBefore ?? bestBeforeIn(shelfLife), shelfLife });
  } else if (difference < 0) {
    await takeFromLots(tx, { storeId, productId, quantity: -difference, outcome: "adjusted", order: "oldest" });
    await tx.storeStock.update({ where: { storeId_productId: { storeId, productId } }, data: { quantity } });
  }
}

// Rayon vide à la préparation : le stock affiché était faux, tous les lots du produit sont remis à zéro
export async function emptyShelf(tx: Tx, storeId: string, productId: string) {
  const lots = await tx.stockLot.findMany({ where: { storeId, productId, closedAt: null }, select: { id: true, quantity: true } });
  for (const lot of lots) {
    await tx.stockLot.update({
      where: { id: lot.id },
      data: { quantity: 0, adjustedQuantity: { increment: lot.quantity }, closedAt: new Date() },
    });
  }
  await tx.storeStock.updateMany({ where: { storeId, productId }, data: { quantity: 0 } });
}

// Unités manquantes à la préparation : elles ne viennent d'aucun lot, la traçabilité de la ligne est
// réduite d'autant (en partant des dernières unités attribuées)
export async function trimAllocations(tx: Tx, lineId: string, missing: number) {
  if (missing <= 0) return;
  const allocations = await tx.lotAllocation.findMany({ where: { lineId }, orderBy: { createdAt: "desc" }, select: { id: true, quantity: true } });
  let remaining = missing;
  for (const allocation of allocations) {
    if (remaining === 0) break;
    const units = Math.min(remaining, allocation.quantity);
    if (units === allocation.quantity) await tx.lotAllocation.delete({ where: { id: allocation.id } });
    else await tx.lotAllocation.update({ where: { id: allocation.id }, data: { quantity: { decrement: units } } });
    remaining -= units;
  }
}

// Annulation d'une commande : les unités reviennent aux lots dont elles venaient (opérations à passer
// dans un prisma.$transaction, avec la remise en stock du magasin)
export function releaseAllocations(allocations: { id: string; lotId: string; quantity: number }[]) {
  if (allocations.length === 0) return [];
  return [
    ...allocations.map((allocation) =>
      prisma.stockLot.update({
        where: { id: allocation.lotId },
        data: { quantity: { increment: allocation.quantity }, soldQuantity: { decrement: allocation.quantity }, closedAt: null },
      })
    ),
    prisma.lotAllocation.deleteMany({ where: { id: { in: allocations.map((allocation) => allocation.id) } } }),
  ];
}
