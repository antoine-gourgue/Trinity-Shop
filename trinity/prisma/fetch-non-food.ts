// Sélectionne les produits des rayons Hygiène-Beauté et Entretien-Maison sur Open Beauty Facts et
// Open Products Facts (les bases sœurs d'Open Food Facts), en ne gardant que ceux dont la photo de
// face a été déposée par le fabricant lui-même : un compte « org-… » de la plateforme producteurs
// (Système U pour la marque U, Unilever pour Signal, Dove, Skip, Persil…).
// - Photos enregistrées dans public/products/<code-barres>.jpg
// - Sélection écrite dans data/non-food.json, puis importée par import-national-brands.ts
//
// Usage :
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/fetch-non-food.ts

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAYONS, slugify } from "../lib/rayons";
import { brandDisplayNames, brandList, cleanProductName, pickBrand } from "../lib/open-food-facts-mapping";

const root = join(__dirname, "..");
const outputFile = join(root, "data/non-food.json");
const imagesDir = join(root, "public/products");

const PER_SUBCATEGORY = 14;
const PAGE_DELAY_MS = 1200;
const IMAGE_DELAY_MS = 250;
const IMAGE_WORKERS = 4;
const USER_AGENT = "TrinityShop/1.0 (Epitech school project)";

const SITES = [
  { api: "https://world.openbeautyfacts.org", images: "https://images.openbeautyfacts.org" },
  { api: "https://world.openproductsfacts.org", images: "https://images.openproductsfacts.org" },
];

// Comptes fabricants retenus : la marque du magasin et un grand groupe de marques nationales. Les
// autres comptes non alimentaires sont ceux d'enseignes concurrentes (Auchan, Carrefour…).
const OWNERS = ["org-systeme-u", "org-unilever-france-gms"];

// Variantes de la marque U, ramenées aux marques du catalogue
const STORE_BRANDS: Record<string, string> = {
  u: "u",
  "super-u": "u",
  superu: "u",
  "hyper-u": "u",
  hu: "u",
  "systeme-u": "u",
  "u-nature": "u",
  "u-bio": "u-bio",
};
// Mentions prises pour des marques (« Bio, Monsavon »)
const NOT_BRANDS = new Set(["bio", "nature", "organic"]);

// Libellés illisibles sur les bases ouvertes, corrigés à la main
const NAME_OVERRIDES: Record<string, string> = {
  "3014230021237": "Après-rasage Original",
  "3014230000201": "Déodorant spray Original",
  "8710522443477": "Brosse à dents en bambou souple",
  "8720181141690": "Gel douche bio abricot et pointe de basilic",
  "3256224215561": "Mèche WC",
  "8712561629089": "Gel douche surgras à l'huile",
};

// Nom de l'unité d'une contenance donnée sans unité (« 9 » rouleaux, « 110 » mouchoirs)
const COUNT_UNITS: Record<string, string> = {
  "entretien-maison/papier-et-essuie-tout": "rouleaux",
  "hygiene-beaute/mouchoirs-et-cotons": "mouchoirs",
};

// Sous-rayon de chaque produit : d'abord d'après son nom, plus fiable que les catégories de ces bases
// (souvent absentes, ou trop larges : « liquid-detergent » sert pour la lessive comme pour la
// vaisselle), puis d'après ses catégories. L'entretien passe avant l'hygiène : un « savon de
// Marseille pour textiles » est une lessive.
const RULES: { sub: string; tags: string[]; name: RegExp }[] = [
  { sub: "entretien-maison/adoucissants", tags: ["en:fabric-softeners-dryer-sheets", "en:fabric-softeners", "fr:adoucissants"], name: /adoucissant|assouplissant|perles de parfum/i },
  { sub: "entretien-maison/vaisselle", tags: ["en:dish-detergent-soap", "fr:liquide-vaisselle", "en:dishwasher-detergents"], name: /vaisselle/i },
  { sub: "entretien-maison/lessives", tags: ["en:laundry-detergents", "fr:lessive", "fr:lessive-liquide", "en:liquid-detergent"], name: /lessive|capsules?|\bcaps\b|d[ée]tachant|textiles?|\blinge\b|\bpoudre\b/i },
  { sub: "entretien-maison/papier-et-essuie-tout", tags: ["en:toilet-papers", "en:household-paper-products", "en:paper-towels", "fr:papiers-toilette"], name: /papier toilette|papier wc|essuie-tout/i },
  {
    sub: "entretien-maison/nettoyants-menagers",
    tags: ["en:cleaning-and-disinfecting-solutions", "en:household-cleaning-products", "en:toilet-gel", "fr:vinaigre-menager", "fr:desodorisants"],
    name: /nettoyant|javel|d[ée]sinfect|d[ée]graissant|vitres|\bsols?\b|\bwc\b|vinaigre m[ée]nager|d[ée]sodorisant|d[ée]tartrant/i,
  },
  { sub: "hygiene-beaute/hygiene-dentaire", tags: ["en:toothpastes", "en:toothbrushes", "en:mouthwash", "en:oral-care"], name: /dentifrice|brosses? à dents|bain de bouche|dentaire/i },
  { sub: "hygiene-beaute/deodorants", tags: ["en:deodorants", "en:anti-perspirants"], name: /d[ée]odorant|anti-?transpirant/i },
  { sub: "hygiene-beaute/rasage", tags: ["en:shaving", "en:aftershaves", "en:shaving-gel", "en:shaving-soaps"], name: /rasage|rasoir/i },
  { sub: "hygiene-beaute/cheveux", tags: ["en:hair", "en:shampoos", "en:conditioners", "en:hair-styling-products", "en:hair-sprays"], name: /shampo|cheveux|capillaire|laque/i },
  { sub: "hygiene-beaute/mouchoirs-et-cotons", tags: ["fr:mouchoirs", "en:tissues", "en:cotton-swabs", "en:cotton-pads"], name: /mouchoir|coton|b[âa]tonnets? ouat/i },
  { sub: "hygiene-beaute/douche-et-bain", tags: ["en:shower-gels", "en:showers-and-baths", "en:soaps", "en:shower-oils", "en:marseille-soaps"], name: /douche|savon|bain moussant/i },
];

interface Hit {
  code: string;
  product_name_fr?: string;
  generic_name_fr?: string;
  brands?: string;
  quantity?: string;
  categories_tags?: string[];
  unique_scans_n?: number;
  images?: Record<string, { imgid?: string | number; rev?: string | number; uploader?: string; sizes?: { full?: { w: number; h: number } } }>;
}

interface Candidate {
  hit: Hit;
  rev: string;
  imagesHost: string;
  sub: string;
  brand: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string | URL, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (res?.ok) return res;
    if (res?.status === 404) return null;
    await sleep(attempt * 5000);
  }
  return null;
}

// Produits d'un compte fabricant vendus en France, page par page
async function ownerProducts(api: string, owner: string) {
  const hits: Hit[] = [];
  for (let page = 1; ; page++) {
    const url = new URL("/api/v2/search", api);
    url.searchParams.set("owners_tags", owner);
    url.searchParams.set("countries_tags", "en:france");
    url.searchParams.set("page_size", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("fields", "code,product_name_fr,generic_name_fr,brands,quantity,categories_tags,images,unique_scans_n");
    const res = await fetchWithRetry(url);
    if (!res) throw new Error(`Recherche impossible : ${owner} sur ${api}`);
    // Certaines fiches contiennent des caractères de contrôle dans leurs textes
    // eslint-disable-next-line no-control-regex
    const body = JSON.parse((await res.text()).replace(/[\u0000-\u001f]/g, " ")) as { products?: Hit[] };
    const products = body.products ?? [];
    hits.push(...products);
    if (products.length < 100) return hits;
    await sleep(PAGE_DELAY_MS);
  }
}

// Révision de la photo de face si elle vient du fabricant (et fait au moins 400 px), sinon null
function officialFrontRev(hit: Hit) {
  const front = hit.images?.front_fr;
  const raw = front?.imgid !== undefined ? hit.images?.[String(front.imgid)] : undefined;
  if (front?.rev === undefined || !raw?.uploader?.startsWith("org-")) return null;
  const size = raw.sizes?.full;
  return size && Math.max(size.w, size.h) >= 400 ? String(front.rev) : null;
}

function subFor(hit: Hit) {
  const tags = (hit.categories_tags ?? []).map((tag) => tag.toLowerCase());
  const name = hit.product_name_fr ?? "";
  const rule = RULES.find((candidate) => candidate.name.test(name)) ?? RULES.find((candidate) => candidate.tags.some((tag) => tags.includes(tag)));
  return rule?.sub ?? null;
}

// Marque retenue : marque U du magasin, sinon la marque nationale (pas le groupe Unilever)
function brandFor(hit: Hit) {
  const brands = brandList(hit.brands).filter((brand) => !NOT_BRANDS.has(slugify(brand)));
  const store = brands.map((brand) => STORE_BRANDS[slugify(brand)]).find(Boolean);
  return store ?? pickBrand(brands, hit.product_name_fr);
}

function imageUrl(host: string, code: string, rev: string) {
  const path = code.match(/^(\d{3})(\d{3})(\d{3})(\d+)$/)!.slice(1).join("/");
  return `${host}/images/products/${path}/front_fr.${rev}.400.jpg`;
}

// Contenance lisible : sans le « ℮ » métrologique, et avec une unité pour un simple nombre
function cleanQuantity(quantity: string | undefined, sub: string, name: string) {
  const value = (quantity ?? "").replace(/\s*(℮|\be\b)\s*$/i, "").replace(/\s+/g, " ").trim();
  const count = value.match(/^x?\s*(\d+)$/i);
  if (!count) return value;
  const amount = Number(count[1]);
  // Les cotons-tiges du rayon mouchoirs se comptent à la pièce
  const unit = sub === "hygiene-beaute/mouchoirs-et-cotons" && !/mouchoir/i.test(name) ? "pièces" : COUNT_UNITS[sub];
  return amount === 1 ? "1 pièce" : `${amount} ${unit ?? "pièces"}`;
}

function isJpeg(buffer: Buffer) {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

async function main() {
  const subCategory = new Map<string, string>(RAYONS.flatMap((rayon) => rayon.subcategories.map((sub) => [`${rayon.slug}/${sub.slug}`, sub.category])));
  for (const rule of RULES) if (!subCategory.has(rule.sub)) throw new Error(`Sous-rayon inconnu dans lib/rayons.ts : ${rule.sub}`);

  // 1. Candidats : photo de face officielle, nom français, code EAN-13, sous-rayon reconnu
  const candidates = new Map<string, Candidate>();
  const rejected = { photo: 0, name: 0, sub: 0, brand: 0 };
  for (const site of SITES) {
    for (const owner of OWNERS) {
      const hits = await ownerProducts(site.api, owner);
      console.log(`${site.api.replace("https://world.", "")} · ${owner} : ${hits.length} fiches`);
      for (const hit of hits) {
        if (!/^\d{13}$/.test(hit.code) || candidates.has(hit.code)) continue;
        const rev = officialFrontRev(hit);
        if (!rev) {
          rejected.photo++;
          continue;
        }
        if (!hit.product_name_fr?.trim()) {
          rejected.name++;
          continue;
        }
        const sub = subFor(hit);
        if (!sub) {
          rejected.sub++;
          continue;
        }
        const brand = brandFor(hit);
        if (!brand) {
          rejected.brand++;
          continue;
        }
        candidates.set(hit.code, { hit, rev, imagesHost: site.images, sub, brand });
      }
      await sleep(PAGE_DELAY_MS);
    }
  }
  console.log(`${candidates.size} candidats ; écartés : ${JSON.stringify(rejected)}`);

  // 2. Jusqu'à PER_SUBCATEGORY produits par sous-rayon, les plus scannés d'abord, sans deux libellés
  //    identiques
  const chosen: Candidate[] = [];
  for (const sub of new Set(RULES.map((rule) => rule.sub))) {
    const ranked = [...candidates.values()].filter((c) => c.sub === sub).sort((a, b) => (b.hit.unique_scans_n ?? 0) - (a.hit.unique_scans_n ?? 0));
    const picked: Candidate[] = [];
    const names = new Set<string>();
    for (const candidate of ranked) {
      if (picked.length >= PER_SUBCATEGORY) break;
      const name = slugify(candidate.hit.product_name_fr!);
      if (names.has(name)) continue;
      names.add(name);
      picked.push(candidate);
    }
    chosen.push(...picked);
    console.log(`  ${sub.padEnd(40)} ${String(picked.length).padStart(2)} produits (${ranked.length} candidats)`);
  }
  const brandNames = brandDisplayNames(chosen.map((c) => c.brand));

  // 3. Photos officielles, quelques-unes à la fois
  const missing = new Set<string>();
  const queue = chosen.filter(({ hit }) => !existsSync(join(imagesDir, `${hit.code}.jpg`)));
  console.log(`${chosen.length} produits retenus, ${queue.length} photos à télécharger`);
  await Promise.all(
    Array.from({ length: IMAGE_WORKERS }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const res = await fetchWithRetry(imageUrl(item.imagesHost, item.hit.code, item.rev));
        const buffer = res ? Buffer.from(await res.arrayBuffer()) : null;
        if (buffer && isJpeg(buffer)) writeFileSync(join(imagesDir, `${item.hit.code}.jpg`), buffer);
        else missing.add(item.hit.code);
        await sleep(IMAGE_DELAY_MS);
      }
    })
  );

  // 4. Fiches au format de data/national-brands.json
  const products = chosen
    .filter(({ hit }) => {
      if (missing.has(hit.code)) console.warn(`Photo indisponible : ${hit.code}`);
      return !missing.has(hit.code);
    })
    .map(({ hit, rev, imagesHost, sub, brand }) => {
      const display = brandNames.get(slugify(brand)) ?? brand;
      const name =
        NAME_OVERRIDES[hit.code] ?? cleanProductName(hit.product_name_fr!, [display, ...brandList(hit.brands)], hit.generic_name_fr?.trim());
      return {
        name,
        barCode: hit.code,
        image_url: imageUrl(imagesHost, hit.code, rev),
        categories: [subCategory.get(sub)!],
        nutriscore: "unknown",
        // Marque du magasin en slug (« u »), comme le reste du catalogue
        brands: [STORE_BRANDS[slugify(brand)] ?? display],
        quantity: cleanQuantity(hit.quantity, sub, hit.product_name_fr!),
        description: hit.generic_name_fr?.trim() || name,
      };
    });

  writeFileSync(outputFile, JSON.stringify(products, null, 4) + "\n");
  console.log(`${products.length} produits écrits dans data/non-food.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
