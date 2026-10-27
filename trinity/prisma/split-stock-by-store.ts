// Crée le stock de chaque magasin (StoreStock) à partir de l'ancien stock unique (Stock), réparti par
// store-stock.ts. Sans effet sur un stock déjà créé : le script peut être relancé sans risque.
// L'ancienne table Stock n'est pas modifiée : la version en ligne continue de fonctionner jusqu'au déploiement.
//
// Usage (après « prisma db push », qui crée la table StoreStock) :
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/split-stock-by-store.ts

import { PrismaClient } from "@prisma/client";
import { HISTORIC_STORE_SLUG } from "./stores-data";
import { storeQuantity } from "./store-stock";

const prisma = new PrismaClient();
const BATCH = 5000;

async function main() {
  const [stores, references] = await Promise.all([
    prisma.store.findMany({ select: { id: true, slug: true } }),
    prisma.stock.findMany({ select: { productId: true, quantity: true } }),
  ]);
  if (stores.length === 0) throw new Error("Aucun magasin en base : lancez d'abord prisma/sync-stores.ts.");

  const rows = references.flatMap(({ productId, quantity }) =>
    stores.map((store) => ({
      storeId: store.id,
      productId,
      quantity: storeQuantity(quantity, store.slug, productId, store.slug === HISTORIC_STORE_SLUG),
    }))
  );

  let created = 0;
  for (let start = 0; start < rows.length; start += BATCH) {
    const { count } = await prisma.storeStock.createMany({ data: rows.slice(start, start + BATCH), skipDuplicates: true });
    created += count;
  }
  const ruptures = rows.filter((row) => row.quantity === 0).length;
  console.log(
    `${references.length} produits × ${stores.length} magasins : ${created} stock(s) créé(s), ${rows.length - created} déjà présent(s) ; ${ruptures} rupture(s).`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
