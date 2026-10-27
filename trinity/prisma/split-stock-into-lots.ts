// Passage au stock par lots datés :
// 1. durée de conservation de chaque produit, d'après son rayon ;
// 2. lots de chaque stock existant, comme dans un vrai rayon : un lot tout juste reçu, un plus ancien
//    et, pour le frais, un lot proche de sa date (une partie passe donc en anti-gaspi).
// Un stock qui a déjà des lots ouverts est laissé tel quel : le script peut être relancé.
//
// Usage :
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/split-stock-into-lots.ts

import { PrismaClient } from "@prisma/client";
import { bestBeforeIn, initialLots, markdownWindow, shelfLifeDays } from "../lib/shelf-life";

const prisma = new PrismaClient();
const DAY = 86_400_000;

async function main() {
  const now = new Date();

  // Durées de conservation, enregistrées par groupes de produits qui ont la même
  const products = await prisma.product.findMany({ select: { id: true, shelfLifeDays: true, categories: { select: { categoryName: true } } } });
  const shelfLife = new Map(products.map((product) => [product.id, shelfLifeDays(product.categories.map((category) => category.categoryName))]));
  const changed = new Map<number, string[]>();
  for (const product of products) {
    const days = shelfLife.get(product.id) ?? product.shelfLifeDays;
    if (days !== product.shelfLifeDays) changed.set(days, [...(changed.get(days) ?? []), product.id]);
  }
  for (const [days, ids] of changed) {
    await prisma.product.updateMany({ where: { id: { in: ids } }, data: { shelfLifeDays: days } });
  }

  // Lots des stocks qui n'en ont pas encore
  const withLots = await prisma.stockLot.groupBy({ by: ["storeId", "productId"], where: { closedAt: null } });
  const done = new Set(withLots.map((lot) => `${lot.storeId}:${lot.productId}`));
  const stocks = await prisma.storeStock.findMany({ where: { quantity: { gt: 0 } }, select: { storeId: true, productId: true, quantity: true } });

  let converted = 0;
  let onSale = 0;
  const lots = stocks.flatMap((stock) => {
    if (done.has(`${stock.storeId}:${stock.productId}`)) return [];
    converted++;
    const days = shelfLife.get(stock.productId) ?? 180;
    const window = markdownWindow(days);
    return initialLots(stock.quantity, days, `${stock.storeId}:${stock.productId}`).map((lot) => {
      if (lot.daysLeft <= window) onSale++;
      return {
        storeId: stock.storeId,
        productId: stock.productId,
        quantity: lot.quantity,
        initialQuantity: lot.quantity,
        bestBefore: bestBeforeIn(lot.daysLeft, now),
        markdownDays: window,
        // Reçu quand il lui restait toute sa durée de conservation
        receivedAt: new Date(now.getTime() - Math.max(0, days - lot.daysLeft) * DAY),
      };
    });
  });
  for (let start = 0; start < lots.length; start += 5000) {
    await prisma.stockLot.createMany({ data: lots.slice(start, start + 5000) });
  }

  console.log(
    `${products.length} produits (${[...changed.values()].flat().length} durées de conservation mises à jour) ; ` +
      `${lots.length} lots créés pour ${converted} stocks, dont ${onSale} déjà en anti-gaspi.`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
