// Importe en base les produits de marques nationales de data/national-brands.json
// (préparés par fetch-national-brands.ts), avec des prix calculés comme pour le reste
// du catalogue. Les ajoute aussi à data/complete_products.json et data/off-enrichment.json
// pour qu'un nouveau seed et apply-pricing.ts les connaissent.
// Relançable : les codes-barres déjà présents en base sont ignorés.
//
// Usage :
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/import-national-brands.ts --dry-run
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/import-national-brands.ts

import { PrismaClient, nutriScore } from "@prisma/client";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computePrice, seeded } from "../lib/pricing";
import { HISTORIC_STORE_SLUG } from "./stores-data";
import { storeQuantity } from "./store-stock";
import {
  type CatalogEntry,
  catalogSchema,
  enrichmentSchema,
  importedProductsSchema,
  nationalProductsSchema,
  readJsonFile,
} from "./data-files";

const DRY_RUN = process.argv.includes("--dry-run");
const root = join(__dirname, "..");
const inputFile = join(root, "data/national-brands.json");
const productsFile = join(root, "data/complete_products.json");
const enrichmentFile = join(root, "data/off-enrichment.json");
const backupFile = join(root, "prisma/backups/national-brands-imported.json");

const GRADES: Record<string, nutriScore> = {
  a: nutriScore.A,
  b: nutriScore.B,
  c: nutriScore.C,
  d: nutriScore.D,
  e: nutriScore.E,
};

async function main() {
  const prisma = new PrismaClient();
  const products = readJsonFile(inputFile, nationalProductsSchema);

  const [categoryGroups, categories, brands, existing] = await Promise.all([
    prisma.categoriesProducts.groupBy({ by: ["categoryName"], _count: { _all: true } }),
    prisma.category.findMany({ select: { name: true } }),
    prisma.brand.findMany({ select: { id: true, name: true } }),
    prisma.product.findMany({ where: { barCode: { in: products.map((p) => BigInt(p.barCode)) } }, select: { barCode: true } }),
  ]);
  const categoryCounts = new Map(categoryGroups.map((g) => [g.categoryName, g._count._all]));
  const knownCategories = new Set(categories.map((c) => c.name));
  const brandIds = new Map(brands.map((b) => [b.name, b.id]));
  const existingCodes = new Set(existing.map((p) => p.barCode.toString()));

  const pending = products
    .filter((p) => !existingCodes.has(p.barCode))
    .map((p) => ({
      ...p,
      categories: p.categories.filter((name) => knownCategories.has(name)),
      ...computePrice(p.name, p.barCode, p.categories, p.brands[0], p.quantity, categoryCounts),
    }));

  const euros = pending.map((p) => p.price / 1000).sort((a, b) => a - b);
  console.log(`${pending.length} produits à importer (${existingCodes.size} déjà en base)`);
  if (euros.length) {
    console.log(`Prix : min ${euros[0]} € · médiane ${euros[Math.floor(euros.length / 2)]} € · max ${euros[euros.length - 1]} €`);
    console.log(`${pending.filter((p) => p.regularPrice).length} en promotion · ${new Set(pending.map((p) => p.brands[0])).size} marques`);
  }
  for (const p of pending.filter((_, i) => i % Math.max(1, Math.floor(pending.length / 25)) === 0)) {
    console.log(
      `  ${`${p.brands[0]} · ${p.name}`.slice(0, 60).padEnd(60)} ${p.quantity.padEnd(10)} ${(p.price / 1000).toFixed(2)} €${p.regularPrice ? ` (au lieu de ${(p.regularPrice / 1000).toFixed(2)} €)` : ""}`
    );
  }
  if (DRY_RUN) {
    await prisma.$disconnect();
    return;
  }

  const stores = await prisma.store.findMany({ select: { id: true, slug: true } });
  const imported: { id: string; barCode: string }[] = [];
  for (const p of pending) {
    // Stock de référence, réparti entre les magasins comme celui du reste du catalogue
    const reference = 40 + Math.floor(seeded(`${p.barCode}:stock`) * 400);
    let brandId = brandIds.get(p.brands[0]);
    if (!brandId) {
      brandId = (await prisma.brand.create({ data: { name: p.brands[0] } })).id;
      brandIds.set(p.brands[0], brandId);
    }
    const created = await prisma.product.create({
      data: {
        name: p.name,
        barCode: BigInt(p.barCode),
        picture: p.image_url,
        nutriScore: GRADES[p.nutriscore] ?? nutriScore.unknown,
        brandId,
        price: p.price,
        regularPrice: p.regularPrice,
        netContent: p.quantity,
        description: p.description,
        categories: { create: p.categories.map((name) => ({ category: { connect: { name } } })) },
        stocks: {
          createMany: {
            data: stores.map((store) => ({
              storeId: store.id,
              quantity: storeQuantity(reference, store.slug, p.barCode, store.slug === HISTORIC_STORE_SLUG),
            })),
          },
        },
      },
      select: { id: true },
    });
    imported.push({ id: created.id, barCode: p.barCode });
    if (imported.length % 50 === 0) console.log(`Importés : ${imported.length}/${pending.length}`);
  }

  // Liste des produits créés, pour pouvoir annuler l'import
  mkdirSync(join(root, "prisma/backups"), { recursive: true });
  const previous = existsSync(backupFile) ? readJsonFile(backupFile, importedProductsSchema) : [];
  writeFileSync(backupFile, JSON.stringify([...previous, ...imported], null, 2) + "\n");

  // Données du seed et contenances, pour une base neuve identique
  const catalog = readJsonFile(productsFile, catalogSchema);
  const catalogCodes = new Set(catalog.map((p) => String(p.barCode)));
  const enrichment = readJsonFile(enrichmentFile, enrichmentSchema);
  for (const p of pending) {
    enrichment[p.barCode] = { quantity: p.quantity, image: p.image_url };
    if (catalogCodes.has(p.barCode)) continue;
    catalog.push({
      name: p.name,
      barCode: p.barCode,
      image_url: p.image_url,
      categories: p.categories,
      nutriscore: p.nutriscore,
      brands: p.brands,
      price: p.price,
      regularPrice: p.regularPrice,
      quantity: p.quantity,
      description: p.description,
    } satisfies CatalogEntry);
  }
  writeFileSync(productsFile, JSON.stringify(catalog, null, 4) + "\n");
  writeFileSync(enrichmentFile, JSON.stringify(enrichment, null, 2) + "\n");

  console.log(`${imported.length} produits importés.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
