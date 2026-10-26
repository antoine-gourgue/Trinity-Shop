// Remplace des photos produits par la photo officielle du fabricant listée dans
// data/photo-replacements.json ([{ barCode, image_url }]) :
// - télécharge la photo dans public/products/<code-barres>.jpg (en écrasant l'ancienne)
// - met à jour l'URL dans data/complete_products.json et data/off-enrichment.json
// - avec --db, met aussi à jour le champ picture en base (secours quand la photo locale manque)
//
// Usage :
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/replace-photos.ts --dry-run
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/replace-photos.ts [--db]

import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const UPDATE_DB = process.argv.includes("--db");
const root = join(__dirname, "..");
const replacementsFile = join(root, "data/photo-replacements.json");
const productsFile = join(root, "data/complete_products.json");
const enrichmentFile = join(root, "data/off-enrichment.json");
const imagesDir = join(root, "public/products");

const WORKERS = 4;
const USER_AGENT = "TrinityShop/1.0 (Epitech school project)";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function download(url: string) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30000) }).catch(
      () => null
    );
    if (res?.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      // JPEG valide uniquement
      if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return buffer;
      return null;
    }
    if (res?.status === 404) return null;
    await sleep(attempt * 5000);
  }
  return null;
}

async function main() {
  const replacements: { barCode: string; image_url: string }[] = JSON.parse(readFileSync(replacementsFile, "utf8"));
  console.log(`${replacements.length} photos à remplacer`);
  if (DRY_RUN) return;

  // 1. Photos, quelques-unes à la fois
  const done: typeof replacements = [];
  const queue = [...replacements];
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const buffer = await download(item.image_url);
        if (buffer) {
          writeFileSync(join(imagesDir, `${item.barCode}.jpg`), buffer);
          done.push(item);
        } else {
          console.warn(`Photo indisponible : ${item.barCode}`);
        }
        if ((done.length + 1) % 50 === 0) console.log(`Photos : ${done.length}`);
      }
    })
  );

  // 2. URL de la photo dans les données du seed, puis en base si demandé
  const urls = new Map(done.map((item) => [item.barCode, item.image_url]));
  const catalog: { barCode: string; image_url?: string }[] = JSON.parse(readFileSync(productsFile, "utf8"));
  for (const product of catalog) {
    const url = urls.get(String(product.barCode));
    if (url) product.image_url = url;
  }
  writeFileSync(productsFile, JSON.stringify(catalog, null, 4) + "\n");

  const enrichment: Record<string, { image?: string | null }> = JSON.parse(readFileSync(enrichmentFile, "utf8"));
  for (const [code, url] of urls) enrichment[code] = { ...enrichment[code], image: url };
  writeFileSync(enrichmentFile, JSON.stringify(enrichment, null, 2) + "\n");

  if (!UPDATE_DB) {
    console.log(`${done.length} photos remplacées (base non modifiée, relancer avec --db pour le champ picture).`);
    return;
  }
  const prisma = new PrismaClient();
  const items = [...urls.entries()];
  for (let i = 0; i < items.length; i += 50) {
    await prisma.$transaction(
      items
        .slice(i, i + 50)
        .map(([code, url]) => prisma.product.updateMany({ where: { barCode: BigInt(code) }, data: { picture: url } }))
    );
  }
  await prisma.$disconnect();
  console.log(`${done.length} photos remplacées.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
