// Calcule des prix réalistes et des promotions à partir de la contenance OpenFoodFacts,
// puis les enregistre dans data/complete_products.json (pour le seed) et en base.
// Déterministe : le même code-barres donne toujours le même prix.
//
// Usage :
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/apply-pricing.ts --dry-run
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/apply-pricing.ts

import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAYONS, findRayonForCategories } from "../lib/rayons";
import { parseQuantity } from "../lib/product-info";

const DRY_RUN = process.argv.includes("--dry-run");
const root = join(__dirname, "..");
const productsFile = join(root, "data/complete_products.json");
const enrichmentFile = join(root, "data/off-enrichment.json");

// Prix de référence en € par kg (ou par litre), par sous-rayon puis par rayon
const UNIT_PRICES: Record<string, number> = {
  "fruits-legumes/legumes": 3.2,
  "fruits-legumes/fruits": 4.5,
  "fruits-legumes/salades": 10,
  "fruits-legumes/compotes": 4,
  "fruits-legumes/fruits-a-coque": 20,
  "fruits-legumes/legumineuses": 4.5,
  "viandes-poissons/volailles": 11,
  "viandes-poissons/porc": 13,
  "viandes-poissons/boeuf": 17,
  "viandes-poissons/poissons": 20,
  "viandes-poissons/produits-de-la-mer": 20,
  "viandes-poissons/poissons-fumes": 45,
  "charcuterie-traiteur/jambons": 16,
  "charcuterie-traiteur/saucissons": 20,
  "charcuterie-traiteur/terrines": 14,
  "charcuterie-traiteur/plats-cuisines": 7,
  "charcuterie-traiteur/salades-composees": 10,
  "charcuterie-traiteur/sandwichs": 13,
  "charcuterie-traiteur/pizzas-et-quiches": 8,
  "cremerie/fromages": 16,
  "cremerie/yaourts": 3.2,
  "cremerie/desserts-lactes": 5,
  "cremerie/laits": 1.1,
  "cremerie/beurres": 11,
  "cremerie/cremes": 5.5,
  "cremerie/fromages-blancs": 3.5,
  "surgeles/plats-cuisines": 7.5,
  "surgeles/glaces-et-sorbets": 8,
  "surgeles/desserts-glaces": 9,
  "surgeles/legumes-surgeles": 3,
  "surgeles/viandes-surgelees": 11,
  "surgeles/poissons-surgeles": 14,
  "epicerie-salee/pates": 3.5,
  "epicerie-salee/riz": 3.2,
  "epicerie-salee/conserves": 4.5,
  "epicerie-salee/sauces": 7,
  "epicerie-salee/soupes": 3,
  "epicerie-salee/aperitif": 13,
  "epicerie-salee/chips": 10,
  "epicerie-salee/plats-en-conserve": 5,
  "epicerie-salee/condiments": 9,
  "epicerie-sucree/biscuits": 8,
  "epicerie-sucree/chocolats": 13,
  "epicerie-sucree/confiseries": 12,
  "epicerie-sucree/cereales": 7.5,
  "epicerie-sucree/confitures": 7,
  "epicerie-sucree/pates-a-tartiner": 8,
  "epicerie-sucree/barres": 12,
  "boissons/jus-de-fruits": 2.2,
  "boissons/eaux": 0.35,
  "boissons/sodas": 1.4,
  "boissons/thes-glaces": 1.5,
  "boissons/boissons-chaudes": 22,
  "boulangerie/pains": 5,
  "boulangerie/viennoiseries": 11,
  "boulangerie/brioches": 6.5,
  "boulangerie/patisseries": 13,
  "boulangerie/gateaux": 10,
  "boulangerie/tartes": 9,
};

const RAYON_UNIT_PRICES: Record<string, number> = {
  "fruits-legumes": 5,
  "viandes-poissons": 15,
  "charcuterie-traiteur": 9,
  cremerie: 6,
  surgeles: 8,
  "epicerie-salee": 6,
  "epicerie-sucree": 9,
  boissons: 2,
  boulangerie: 9,
};

// Prix à l'article quand la contenance est inconnue
const FLAT_PRICES: Record<string, number> = {
  "fruits-legumes": 2.5,
  "viandes-poissons": 6.5,
  "charcuterie-traiteur": 4,
  cremerie: 2.5,
  surgeles: 4.5,
  "epicerie-salee": 2.5,
  "epicerie-sucree": 2.8,
  boissons: 2,
  boulangerie: 2.5,
};

// Prix maximal vraisemblable d'un article par rayon : protège des contenances
// OpenFoodFacts ambiguës (« 8 x 310 g » pour 310 g au total, par exemple)
const MAX_PRICES: Record<string, number> = {
  "fruits-legumes": 7.99,
  "viandes-poissons": 19.99,
  "charcuterie-traiteur": 12.99,
  cremerie: 9.99,
  surgeles: 14.99,
  "epicerie-salee": 9.99,
  "epicerie-sucree": 8.99,
  boissons: 7.99,
  boulangerie: 5.99,
};

// Produits dont le nom trahit un prix au kilo très différent de leur sous-rayon
const NAME_RULES: { pattern: RegExp; unitPrice: number }[] = [
  { pattern: /fromage (frais|blanc)|faisselle|petits? suisses?/i, unitPrice: 3.5 },
];

const BRAND_FACTORS: Record<string, number> = {
  "u-saveurs": 1.25,
  "u-bio": 1.3,
  "u-mat-lou": 1.1,
  "bien-vu": 0.75,
};

const DISCOUNTS = [0.2, 0.25, 0.3, 0.34];
const PROMO_SHARE = 0.1;

// Hachage FNV-1a ramené dans [0, 1[ pour un aléa reproductible
function seeded(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
}

// Prix « psychologique » terminé par 9 centimes, en millièmes d'euro
function shelfPrice(euros: number) {
  const rounded = Math.max(0.39, Math.round(euros * 10) / 10 - 0.01);
  return Math.round(rounded * 100) * 10;
}

// Sous-rayon le plus spécifique parmi ceux du produit : celui qui compte le moins de produits
// (ex. « Poissons fumés » plutôt que « Poissons » pour un saumon fumé)
function mostSpecificSub(categories: string[], categoryCounts: Map<string, number>) {
  const names = new Set(categories);
  const candidates = RAYONS.flatMap((rayon) =>
    rayon.subcategories.filter((sub) => names.has(sub.category)).map((sub) => ({ rayon, sub }))
  );
  candidates.sort(
    (a, b) => (categoryCounts.get(a.sub.category) ?? 0) - (categoryCounts.get(b.sub.category) ?? 0)
  );
  return candidates[0];
}

function computePrice(
  name: string,
  code: string,
  categories: string[],
  brand: string,
  netContent: string | null,
  categoryCounts: Map<string, number>
) {
  const specific = mostSpecificSub(categories, categoryCounts);
  const rayon = specific?.rayon.slug ?? findRayonForCategories(categories)?.rayon.slug;
  const subUnitPrice = specific ? UNIT_PRICES[`${rayon}/${specific.sub.slug}`] : undefined;
  const nameRule = NAME_RULES.find((rule) => rule.pattern.test(name));
  const unitPrice = nameRule?.unitPrice ?? subUnitPrice ?? (rayon ? RAYON_UNIT_PRICES[rayon] : undefined) ?? 8;
  const maxPrice = (rayon ? MAX_PRICES[rayon] : undefined) ?? 14.99;
  const flatPrice = (rayon ? FLAT_PRICES[rayon] : undefined) ?? 3;

  // Œufs vendus à la pièce : « 12 oeufs », ou « 6 unités » dans le sous-rayon Œufs
  const eggs =
    netContent?.match(/(\d+)\s*(?:gros |moyens |petits )?(?:oeufs|œufs)/i) ??
    (specific?.sub.slug === "oeufs" ? netContent?.match(/(\d+)\s*unit/i) : null);
  const quantity = parseQuantity(netContent);
  const base = eggs
    ? Number.parseInt(eggs[1], 10) * 0.3
    : quantity
      ? unitPrice * quantity.amount
      : flatPrice;

  const brandFactor = BRAND_FACTORS[brand] ?? 1;
  const variation = 0.88 + 0.24 * seeded(code);
  const regular = shelfPrice(Math.min(maxPrice, base * brandFactor * variation));

  if (seeded(`${code}:promo`) >= PROMO_SHARE) {
    return { price: regular, regularPrice: null };
  }
  const discount = DISCOUNTS[Math.floor(seeded(`${code}:remise`) * DISCOUNTS.length)];
  const promo = shelfPrice((regular / 1000) * (1 - discount));
  return promo < regular ? { price: promo, regularPrice: regular } : { price: regular, regularPrice: null };
}

async function main() {
  const prisma = new PrismaClient();
  const enrichment: Record<string, { quantity: string | null }> = JSON.parse(readFileSync(enrichmentFile, "utf8"));
  const jsonProducts: Record<string, unknown>[] = JSON.parse(readFileSync(productsFile, "utf8"));

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
