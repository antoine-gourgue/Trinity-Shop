// Calcule des prix réalistes et des promotions à partir de la contenance OpenFoodFacts,
// puis les enregistre dans data/complete_products.json (pour le seed) et en base.
// Déterministe : le même code-barres donne toujours le même prix.
//
// Usage :
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/apply-pricing.ts --dry-run
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/apply-pricing.ts

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { computePrice } from "../lib/pricing";
import { catalogSchema, enrichmentSchema, readJsonFile } from "./data-files";

const DRY_RUN = process.argv.includes("--dry-run");
const root = join(__dirname, "..");
const productsFile = join(root, "data/complete_products.json");
const enrichmentFile = join(root, "data/off-enrichment.json");

async function main() {
  const prisma = new PrismaClient();
  const enrichment = readJsonFile(enrichmentFile, enrichmentSchema);
  const jsonProducts = readJsonFile(productsFile, catalogSchema);

  const categoryGroups = await prisma.categoriesProducts.groupBy({ by: ["categoryName"], _count: { _all: true } });
  const categoryCounts = new Map(categoryGroups.map((g) => [g.categoryName, g._count._all]));

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      barCode: true,
      brand: { select: { name: true } },
      categories: { select: { categoryName: true } },
    },
  });

  const updates = products.map((product) => {
    const code = product.barCode.toString();
    const netContent = enrichment[code]?.quantity ?? null;
    const prices = computePrice(
      product.name,
      code,
      product.categories.map((c) => c.categoryName),
      product.brand.name,
      netContent,
      categoryCounts
    );
    return { id: product.id, code, name: product.name, netContent, ...prices };
  });

  const promos = updates.filter((u) => u.regularPrice);
  const withContent = updates.filter((u) => u.netContent);
  const euros = updates.map((u) => u.price / 1000).sort((a, b) => a - b);
  console.log(`${updates.length} produits · ${withContent.length} avec contenance · ${promos.length} en promotion`);
  console.log(
    `Prix : min ${euros[0]} € · médiane ${euros[Math.floor(euros.length / 2)]} € · max ${euros[euros.length - 1]} €`
  );
  for (const u of updates.slice(0, 12)) {
    console.log(
      `  ${u.name.slice(0, 45).padEnd(45)} ${String(u.netContent ?? "—").padEnd(12)} ${(u.price / 1000).toFixed(2)} €${u.regularPrice ? ` (au lieu de ${(u.regularPrice / 1000).toFixed(2)} €)` : ""}`
    );
  }

  if (DRY_RUN) {
    await prisma.$disconnect();
    return;
  }

  // Le JSON du seed reçoit les mêmes valeurs pour qu'une base neuve soit identique
  const byCode = new Map(updates.map((u) => [u.code, u]));
  for (const item of jsonProducts) {
    const update = byCode.get(String(item.barCode));
    if (!update) continue;
    item.price = update.price;
    item.regularPrice = update.regularPrice;
    item.quantity = update.netContent;
  }
  writeFileSync(productsFile, JSON.stringify(jsonProducts, null, 4) + "\n");

  for (let i = 0; i < updates.length; i += 50) {
    await prisma.$transaction(
      updates.slice(i, i + 50).map((u) =>
        prisma.product.update({
          where: { id: u.id },
          data: { price: u.price, regularPrice: u.regularPrice, netContent: u.netContent },
        })
      )
    );
  }
  console.log("Base mise à jour.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
