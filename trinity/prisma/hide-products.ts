// Masque du catalogue les produits listés dans data/hidden-products.json (codes-barres),
// ici les produits U sans photo officielle sur Open Food Facts. Ils restent en base pour
// les paniers et commandes existants ; seed.ts les recrée masqués grâce au champ « hidden »
// ajouté dans data/complete_products.json.
//
// Usage :
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/hide-products.ts --dry-run
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/hide-products.ts

import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const root = join(__dirname, "..");
const hiddenFile = join(root, "data/hidden-products.json");
const productsFile = join(root, "data/complete_products.json");

async function main() {
  const codes: string[] = JSON.parse(readFileSync(hiddenFile, "utf8"));
  const prisma = new PrismaClient();
  const where = { barCode: { in: codes.map((code) => BigInt(code)) } };

  const [matching, alreadyHidden] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.count({ where: { ...where, hidden: true } }),
  ]);
  console.log(`${codes.length} codes-barres · ${matching} produits en base · ${alreadyHidden} déjà masqués`);
  if (DRY_RUN) {
    await prisma.$disconnect();
    return;
  }

  const { count } = await prisma.product.updateMany({ where, data: { hidden: true } });
  await prisma.$disconnect();

  const hidden = new Set(codes);
  const catalog: { barCode: string; hidden?: boolean }[] = JSON.parse(readFileSync(productsFile, "utf8"));
  for (const product of catalog) {
    if (hidden.has(String(product.barCode))) product.hidden = true;
  }
  writeFileSync(productsFile, JSON.stringify(catalog, null, 4) + "\n");
  console.log(`${count} produits masqués.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
