// Enregistre les magasins de stores-data.ts (créés, ou mis à jour par leur slug), puis rattache au
// magasin historique de Rennes les commandes passées avant le choix du magasin.
//
// Usage :
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/sync-stores.ts

import { PrismaClient } from "@prisma/client";
import { HISTORIC_STORE_SLUG, STORES } from "./stores-data";

const prisma = new PrismaClient();

async function main() {
  for (const store of STORES) {
    const { slug, ...fields } = store;
    await prisma.store.upsert({ where: { slug }, create: store, update: fields });
  }

  const historic = await prisma.store.findUniqueOrThrow({ where: { slug: HISTORIC_STORE_SLUG }, select: { id: true, name: true } });
  const { count } = await prisma.order.updateMany({ where: { storeId: null }, data: { storeId: historic.id } });

  console.log(`${STORES.length} magasins enregistrés ; ${count} commande(s) rattachée(s) à ${historic.name}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
