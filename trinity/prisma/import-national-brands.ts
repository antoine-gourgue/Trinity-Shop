// Importe en base les produits de data/national-brands.json (préparés par fetch-national-brands.ts)
// ou d'un autre fichier au même format (--file data/non-food.json, préparé par fetch-non-food.ts),
// avec des prix calculés comme pour le reste du catalogue, leur stock dans chaque magasin et les
// lots datés de ce stock. Les ajoute aussi à data/complete_products.json et data/off-enrichment.json
// pour qu'un nouveau seed et apply-pricing.ts les connaissent.
// Relançable : les codes-barres déjà présents en base sont ignorés.
//
// Usage :
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/import-national-brands.ts --dry-run
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/import-national-brands.ts
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/import-national-brands.ts --file data/non-food.json

import { PrismaClient, nutriScore } from "@prisma/client";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { computePrice, seeded } from "../lib/pricing";
import { RAYONS, rayonCategoryNames } from "../lib/rayons";
import { bestBeforeIn, initialLots, markdownWindow, shelfLifeDays } from "../lib/shelf-life";
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
const fileArg = process.argv.indexOf("--file");
const root = join(__dirname, "..");
const inputFile = join(root, fileArg > 0 ? process.argv[fileArg + 1] : "data/national-brands.json");
const DAY = 86_400_000;
const productsFile = join(root, "data/complete_products.json");
const enrichmentFile = join(root, "data/off-enrichment.json");
// Liste des produits créés par fichier importé, pour pouvoir annuler l'import
const backupFile = join(root, `prisma/backups/${basename(inputFile, extname(inputFile))}-imported.json`);

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

  // Catégories des rayons pas encore en base (nouveaux rayons : hygiène, entretien…)
  const rayonCategories = new Set(RAYONS.flatMap(rayonCategoryNames));
  const newCategories = [...new Set(products.flatMap((p) => p.categories))].filter((name) => rayonCategories.has(name) && !knownCategories.has(name));
  if (newCategories.length) console.log(`Nouvelles catégories : ${newCategories.join(", ")}`);
  if (!DRY_RUN) {
    for (const name of newCategories) await prisma.category.create({ data: { name } });
  }
  for (const name of newCategories) knownCategories.add(name);

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
  const now = new Date();
  let lotCount = 0;
  for (const p of pending) {
    const shelfLife = shelfLifeDays(p.categories);
    const quantities = stores.map((store) => ({
      store,
      quantity: storeQuantity(40 + Math.floor(seeded(`${p.barCode}:stock`) * 400), store.slug, p.barCode, store.slug === HISTORIC_STORE_SLUG),
    }));
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
        netContent: p.quantity || null,
        description: p.description,
        shelfLifeDays: shelfLife,
        categories: { create: p.categories.map((name) => ({ category: { connect: { name } } })) },
        // Stock de référence, réparti entre les magasins comme celui du reste du catalogue
        stocks: { createMany: { data: quantities.map(({ store, quantity }) => ({ storeId: store.id, quantity })) } },
      },
      select: { id: true },
    });
    // Lots datés de ce stock (le stock d'un magasin est la somme de ses lots), comme
    // split-stock-into-lots.ts pour le reste du catalogue
    const lots = quantities.flatMap(({ store, quantity }) =>
      initialLots(quantity, shelfLife, `${store.id}:${created.id}`).map((lot) => ({
        storeId: store.id,
        productId: created.id,
        quantity: lot.quantity,
        initialQuantity: lot.quantity,
        bestBefore: bestBeforeIn(lot.daysLeft, now),
        markdownDays: markdownWindow(shelfLife),
        receivedAt: new Date(now.getTime() - Math.max(0, shelfLife - lot.daysLeft) * DAY),
      }))
    );
    await prisma.stockLot.createMany({ data: lots });
    lotCount += lots.length;
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

  console.log(`${imported.length} produits importés, ${lotCount} lots créés.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
