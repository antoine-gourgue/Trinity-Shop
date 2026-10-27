import prisma from "@/lib/prisma";
import { bestBeforeFromDay, parisDay } from "@/lib/anti-gaspi";
import { bestBeforeIn, markdownWindow } from "@/lib/shelf-life";
import { REORDER_POINT, expectedDelivery, suggestedQuantity } from "@/lib/restock";

// Tâches de stock de la nuit (tâche planifiée de maintenance), sur tout le réseau : elles portent sur
// des milliers de lignes, d'où quelques requêtes SQL groupées. La table des lots garde son nom
// d'origine (AntiGaspiLot, voir le schéma).

// Lots dont la date est passée : ils sont retirés de la vente (ils quittent le stock du magasin) et
// attendent que le magasin confirme les avoir jetés. Un produit périmé ne se donne plus : le don se
// fait jusqu'au jour de la date.
export async function withdrawExpiredLots(now = new Date()) {
  const today = bestBeforeFromDay(parisDay(now));
  const [, withdrawn] = await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "StoreStock" AS s
      SET quantity = GREATEST(0, s.quantity - expired.units), "updatedAt" = NOW()
      FROM (
        SELECT "storeId", "productId", SUM(quantity)::int AS units
        FROM "AntiGaspiLot"
        WHERE "closedAt" IS NULL AND "withdrawnAt" IS NULL AND quantity > 0 AND "bestBefore" < ${today}
        GROUP BY "storeId", "productId"
      ) AS expired
      WHERE s."storeId" = expired."storeId" AND s."productId" = expired."productId"`,
    prisma.$executeRaw`
      UPDATE "AntiGaspiLot"
      SET "withdrawnAt" = NOW()
      WHERE "closedAt" IS NULL AND "withdrawnAt" IS NULL AND quantity > 0 AND "bestBefore" < ${today}`,
  ]);
  return withdrawn;
}

// Livraisons d'hier (ou avant) que le magasin n'a pas réceptionnées : elles entrent en stock à la
// date habituelle du produit
export async function receiveOverdueRestocks(now = new Date()) {
  const startOfToday = bestBeforeFromDay(parisDay(now));
  return prisma.$transaction(
    async (tx) => {
      // Le passage à « réceptionnée » d'abord : une réception faite au même moment par le magasin
      // n'est jamais comptée deux fois
      const received = await tx.$queryRaw<{ id: string; storeId: string; productId: string; quantity: number }[]>`
        UPDATE "RestockOrder"
        SET status = 'received', "receivedAt" = NOW(), "receivedQuantity" = quantity
        WHERE status = 'ordered' AND "expectedAt" < ${startOfToday}
        RETURNING id, "storeId", "productId", quantity`;
      if (received.length === 0) return 0;

      const products = await tx.product.findMany({
        where: { id: { in: [...new Set(received.map((order) => order.productId))] } },
        select: { id: true, shelfLifeDays: true },
      });
      const shelfLife = new Map(products.map((product) => [product.id, product.shelfLifeDays]));
      await tx.stockLot.createMany({
        data: received.map((order) => {
          const days = shelfLife.get(order.productId) ?? 180;
          return {
            storeId: order.storeId,
            productId: order.productId,
            quantity: order.quantity,
            initialQuantity: order.quantity,
            bestBefore: bestBeforeIn(days, now),
            markdownDays: markdownWindow(days),
            restockOrderId: order.id,
          };
        }),
      });
      await tx.$executeRaw`
        UPDATE "StoreStock" AS s
        SET quantity = s.quantity + r.quantity, "updatedAt" = NOW()
        FROM "RestockOrder" AS r
        WHERE r.id = ANY(${received.map((order) => order.id)}) AND s."storeId" = r."storeId" AND s."productId" = r."productId"`;
      return received.length;
    },
    { timeout: 60_000 }
  );
}

// Réassort automatique : chaque produit en ligne passé sous le seuil, sans commande en cours, est
// recommandé pour la livraison du lendemain
export async function autoReplenish(now = new Date()) {
  const [low, pending] = await Promise.all([
    prisma.storeStock.findMany({
      where: { quantity: { lt: REORDER_POINT }, product: { hidden: false } },
      select: { storeId: true, productId: true, quantity: true },
    }),
    prisma.restockOrder.findMany({ where: { status: "ordered" }, select: { storeId: true, productId: true } }),
  ]);
  const ordered = new Set(pending.map((order) => `${order.storeId}:${order.productId}`));
  const expectedAt = expectedDelivery(now);
  const orders = low
    .filter((stock) => !ordered.has(`${stock.storeId}:${stock.productId}`))
    .map((stock) => ({
      storeId: stock.storeId,
      productId: stock.productId,
      quantity: suggestedQuantity(stock.quantity, 0),
      automatic: true,
      expectedAt,
    }));
  for (let start = 0; start < orders.length; start += 5000) {
    await prisma.restockOrder.createMany({ data: orders.slice(start, start + 5000) });
  }
  return orders.length;
}
