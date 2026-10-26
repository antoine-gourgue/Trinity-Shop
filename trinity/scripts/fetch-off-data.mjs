// Récupère la contenance et l'image de chaque produit sur OpenFoodFacts.
// - Contenances (et URL d'image à jour) écrites dans data/off-enrichment.json
// - Images enregistrées dans public/products/<code-barres>.jpg
// Relançable : les produits déjà traités et les images déjà présentes sont ignorés.
// Usage : node scripts/fetch-off-data.mjs

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsFile = join(root, "data/complete_products.json");
const enrichmentFile = join(root, "data/off-enrichment.json");
const imagesDir = join(root, "public/products");

// L'API produit tolère environ une requête toutes les deux secondes ; au-delà elle
// répond 429. Les images statiques, elles, se téléchargent sans limite stricte.
const PRODUCT_DELAY_MS = 2200;
const IMAGE_DELAY_MS = 250;
const USER_AGENT = "TrinityShop/1.0 (Epitech school project)";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, { attempts = 5, backoffMs = 10000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    if (res?.ok) return res;
    if (res?.status === 404) return null;
    await sleep(attempt * backoffMs);
  }
  return null;
}

function isJpeg(buffer) {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function saveEnrichment(enrichment) {
  writeFileSync(enrichmentFile, JSON.stringify(enrichment, null, 2) + "\n");
}

const products = JSON.parse(readFileSync(productsFile, "utf8"));
const enrichment = existsSync(enrichmentFile) ? JSON.parse(readFileSync(enrichmentFile, "utf8")) : {};
mkdirSync(imagesDir, { recursive: true });

// 1. Images, depuis l'URL connue (mise à jour ou d'origine)
let downloaded = 0;
const missing = [];
for (const product of products) {
  const code = product.barCode;
  const imagePath = join(imagesDir, `${code}.jpg`);
  if (existsSync(imagePath)) continue;

  const source = (enrichment[code]?.image || product.image_url || "").replace(
    "static.openfoodfacts.org",
    "images.openfoodfacts.org"
  );
  const res = source ? await fetchWithRetry(source) : null;
  const buffer = res ? Buffer.from(await res.arrayBuffer()) : null;

  if (buffer && isJpeg(buffer)) {
    writeFileSync(imagePath, buffer);
    downloaded++;
    if (downloaded % 50 === 0) console.log(`Images téléchargées : ${downloaded}`);
  } else {
    missing.push(code);
  }
  await sleep(IMAGE_DELAY_MS);
}
console.log(`Images : ${downloaded} téléchargées, ${missing.length} manquantes${missing.length ? ` (${missing.join(", ")})` : ""}`);

// 2. Contenances, une requête produit à la fois
const pending = products.map((p) => p.barCode).filter((code) => !enrichment[code]);
for (const [index, code] of pending.entries()) {
  const res = await fetchWithRetry(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=quantity,image_front_url`,
    { backoffMs: 30000 }
  );
  const data = res ? await res.json().catch(() => null) : null;
  enrichment[code] = {
    quantity: data?.product?.quantity?.trim() || null,
    image: data?.product?.image_front_url || null,
  };
  if ((index + 1) % 25 === 0 || index === pending.length - 1) {
    saveEnrichment(enrichment);
    console.log(`Contenances : ${index + 1}/${pending.length}`);
  }
  await sleep(PRODUCT_DELAY_MS);
}

console.log("Terminé.");
