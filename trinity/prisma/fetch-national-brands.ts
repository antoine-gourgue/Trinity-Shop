// Sélectionne sur Open Food Facts des produits de marques nationales vendus en France
// dont la photo principale a été fournie par le fabricant : elle est déposée par un compte
// « org-… » de la plateforme producteurs (alimentée par les fiches GS1 / Equadis),
// et non prise en rayon par un contributeur.
// - Photos enregistrées dans public/products/<code-barres>.jpg
// - Sélection écrite dans data/national-brands.json, puis importée par import-national-brands.ts
//
// Usage :
//   ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' prisma/fetch-national-brands.ts

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAYONS, slugify } from "../lib/rayons";

const root = join(__dirname, "..");
const productsFile = join(root, "data/complete_products.json");
const outputFile = join(root, "data/national-brands.json");
const imagesDir = join(root, "public/products");

const PER_SUBCATEGORY = 12;
const PER_BRAND = 3;
const SEARCH_DELAY_MS = 1500;
const IMAGE_DELAY_MS = 250;
const IMAGE_WORKERS = 4;
const USER_AGENT = "TrinityShop/1.0 (Epitech school project)";
const TAXONOMY_URL = "https://static.openfoodfacts.org/data/taxonomies/categories.json";

// Catégories du catalogue dont le nom français a changé dans la taxonomie : on donne
// directement l'étiquette indexée par le moteur de recherche
const SEARCH_TAGS: Record<string, string> = {
  "Fruits et produits dérivés": "en:fruits-based-foods",
  Apéritif: "en:appetizers",
};
const TAG_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(SEARCH_TAGS).map(([name, tag]) => [tag, name])
);

// Marques de distributeurs : le site vend déjà les marques U
const RETAILER_OWNER =
  /carrefour|auchan|systeme-u|leclerc|scamark|intermarche|mousquetaires|lidl|aldi|casino|monoprix|franprix|cora|picard|netto|leader-price|grand-frais|biocoop|naturalia|vie-claire|metro|thiriet|colruyt|delhaize|spar/;
const RETAILER_BRAND =
  /^(carrefour.*|auchan.*|u|u-.+|super-u|hyper-u|systeme-u|marque-repere|eco-plus|casino.*|monoprix.*|franprix|leader-price|picard|lidl|milbona|chabrior|paturages|netto|top-budget|intermarche|bien-vu|reflets-de-france|cora|thiriet|simpl|pouce|mmm|nos-regions-ont-du-talent|tous-les-jours|grand-jury|belle-france|turini|biocoop|naturalia|la-vie-claire)$/;

// Produits hors sujet pour un drive alimentaire
const EXCLUDED_TAGS = [
  "en:baby-foods",
  "en:baby-milks",
  "en:dietary-supplements",
  "en:bodybuilding-supplements",
  "en:meal-replacements",
  "en:alcoholic-beverages",
  "en:pet-food",
];

// Garde-fous par rayon, contre les classements trop larges d'Open Food Facts
// (bouillon « bœuf », moutarde « légumes », biscuit « saucisson »…)
const RAYON_RULES: Record<string, { exclude?: string[]; require?: string }> = {
  "fruits-legumes": {
    exclude: ["en:sauces", "en:mustards", "en:soups", "en:broths", "en:meals", "en:beverages", "en:jams", "en:sweet-spreads"],
  },
  "viandes-poissons": {
    exclude: ["en:broths", "en:soups", "en:sauces", "en:condiments", "en:meals", "en:sandwiches", "en:snacks", "en:pizzas-pies-and-quiches", "en:spreads", "en:dairies"],
  },
  "charcuterie-traiteur": { exclude: ["en:biscuits-and-cakes", "en:sweet-snacks"] },
  cremerie: { exclude: ["en:coffees", "en:hot-beverages", "en:instant-beverages"] },
  surgeles: { require: "en:frozen-foods" },
};

// Groupes industriels : on leur préfère la marque du produit (Nestlé → Nesquik)
const GROUPS = new Set([
  "unilever", "unilever-norge", "pepsico", "nestle", "danone", "ferrero", "ferrero-scandinavia-ab",
  "lactalis", "ebro-foods", "lea-nature", "mondelez", "groupe-bel", "bel",
]);
// Marques reconnues dans le nom quand seul le groupe est renseigné
const NAME_BRANDS: [string, string][] = [
  ["ben & jerry", "Ben & Jerry's"], ["b-ready", "Nutella"], ["maggi", "Maggi"], ["7up", "7UP"], ["pepsi", "Pepsi"],
  ["lipton", "Lipton"], ["lay's", "Lay's"], ["doritos", "Doritos"], ["tropicana", "Tropicana"], ["magnum", "Magnum"],
  ["carte d'or", "Carte d'Or"], ["cornetto", "Cornetto"], ["kinder", "Kinder"], ["nesquik", "Nesquik"],
  ["ricoré", "Ricoré"], ["nescafé", "Nescafé"],
];
// Graphie retenue pour chaque marque (clé : slug), y compris pour regrouper les variantes
const BRAND_LABELS: Record<string, string> = {
  "7up": "7UP",
  "seven-up": "7UP",
  "barilla-norge": "Barilla",
  "barilla-norge-as": "Barilla",
  "carte-d-or": "Carte d'Or",
  "cesar-moroni": "César Moroni",
  "cesar-moront": "César Moroni",
  "chaussee-aux-moines": "Chaussée aux Moines",
  "cite-marine": "Cité Marine",
  "d-aucy": "d'aucy",
  daucy: "d'aucy",
  "diet-pepsi": "Pepsi",
  "elle-et-vire": "Elle & Vire",
  "elle-et-vire-teneur": "Elle & Vire",
  "elle-vire": "Elle & Vire",
  euro: "Kinder",
  "ferrero-scandinavia-ab": "Ferrero",
  ferrerokinder: "Kinder",
  ferreronutella: "Nutella",
  "jardi-bio": "Jardin Bio",
  "jardin-bio": "Jardin Bio",
  "jardin-bio-etic": "Jardin Bio",
  "jardin-bio-logique": "Jardin Bio",
  "l-atelier-pere-dodu": "Père Dodu",
  "la-belle-iloise": "La Belle-Iloise",
  "la-boulangere-bio": "La Boulangère",
  "la-vache-qui-rit": "La Vache qui rit",
  "lay-s": "Lay's",
  "lay-s-lays": "Lay's",
  lays: "Lay's",
  "le-chocolat": "Nestlé",
  "lipton-ice-tea": "Lipton",
  "lustucru-selection": "Lustucru",
  mailleunilever: "Maille",
  "mc-cain": "McCain",
  mccain: "McCain",
  nakd: "Nakd",
  nescafe: "Nescafé",
  nestle: "Nestlé",
  "nestle-dessert": "Nestlé Dessert",
  "nutella-b-ready": "Nutella",
  "pasquierbrioche-pasquier": "Pasquier",
  "pepsi-zero": "Pepsi",
  "pom-potes": "Pom'Potes",
  "pom-potes-ssa": "Pom'Potes",
  president: "Président",
  "pure-leaf": "Pure Leaf",
  "quaker-oats": "Quaker",
  ricore: "Ricoré",
  "val-d-eurre": "Val d'Eurre",
  veloute: "Velouté",
  "veloute-fruix": "Velouté",
};

// Libellés illisibles ou en langue étrangère sur Open Food Facts, corrigés à la main
const NAME_OVERRIDES: Record<string, string> = {
  "8712566246496": "Cornichons extra-fins",
  "3017800078846": "Haricots rouges",
  "3017800501658": "Maïs ultra croquant",
  "3017800132425": "Matelote de thon aux petits légumes",
  "3017800132463": "Saumon et tagliatelles sauce à l'oseille",
  "3248451089466": "Poêlée paysanne",
  "3248451012167": "Épinards hachés à cuire",
  "3248451065798": "Mélange haricots verts et beurre",
  "3017800501849": "Moussaka aux légumes du soleil",
  "3449865328688": "Saucisson sec supérieur x15",
  "3021762516094": "Compotes gourdes pomme, fraise, brugnon, banane x16",
  "3073781192254": "Fromage fondu 32 portions",
  "3033491588136": "Spécialité laitière vanille 15 g de protéines",
  "3155250321799": "Le Bon Moelleux allégé 5 % MG",
  "3366321097042": "Oméga 3 doux",
  "3271820000007": "Lait demi-écrémé de Bretagne UHT",
  "3451790439506": "Crème légère épaisse 12 % MG",
  "3451790439353": "Crème entière épaisse 30 % MG",
  "3033490269500": "Mousse de fromage blanc sur lit de fruits pêche fraise x4",
  "3033491225253": "Aux fruits fraise framboise abricot 50 g x 6",
  "3038354199603": "Sauce pesto vert",
  "8076809513722": "Sauce tomate Basilico",
  "8710908960864": "Velouté douceur 8 légumes",
  "8000300312102": "Chocolat au lait Crunch, lot de 2",
  "7613035040700": "Chocolat noir pâtissier",
  "3760049796797": "Baguettes viennoises bio nature x4",
  "3700679600309": "Pain au lait bio à la farine complète x8",
  "5060088706022": "Barres cacahuètes x4",
  "3228886030011": "Ice Tea saveur pêche",
  "3168930009245": "Tortilla chips goût nature",
  "3261830214136": "Terrine de sanglier au cognac",
  "8076809529433": "Pâtes penne rigate au blé complet",
  "3387390406719": "Barres de céréales",
};
// Produits écartés : fiche en langue étrangère
const SKIPPED = new Set(["3038359006821"]);

interface Hit {
  code: string;
  product_name_fr?: string;
  generic_name_fr?: string;
  brands?: string[] | string;
  brands_tags?: string[];
  owner?: string;
  nutriscore_grade?: string;
  quantity?: string;
  categories_tags?: string[];
  unique_scans_n?: number;
  images?: Record<string, { imgid?: string; rev?: string; uploader?: string; sizes?: { full?: { w: number; h: number } } }>;
}

interface Candidate {
  hit: Hit;
  rev: string;
  subs: Set<string>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string | URL, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30000),
    }).catch(() => null);
    if (res?.ok) return res;
    if (res?.status === 404) return null;
    await sleep(attempt * 5000);
  }
  return null;
}

async function search(tag: string) {
  const url = new URL("https://search.openfoodfacts.org/search");
  url.searchParams.set(
    "q",
    `countries_tags:"en:france" AND categories_tags:"${tag}" AND owner:* AND states_tags:"en:front-photo-selected"`
  );
  url.searchParams.set("page_size", "100");
  url.searchParams.set("sort_by", "-unique_scans_n");
  url.searchParams.set("langs", "fr");
  url.searchParams.set(
    "fields",
    "code,product_name_fr,generic_name_fr,brands,brands_tags,owner,nutriscore_grade,quantity,images,categories_tags,unique_scans_n"
  );
  const res = await fetchWithRetry(url);
  if (!res) throw new Error(`Recherche impossible pour ${tag}`);
  return ((await res.json()) as { hits: Hit[] }).hits;
}

// Révision de la photo de face si elle vient du fabricant, sinon null
function officialFrontRev(hit: Hit) {
  const front = hit.images?.front_fr;
  const raw = front?.imgid ? hit.images?.[front.imgid] : undefined;
  if (!front?.rev || !raw?.uploader?.startsWith("org-")) return null;
  const size = raw.sizes?.full;
  return size && Math.max(size.w, size.h) >= 400 ? front.rev : null;
}

function brandList(hit: Hit) {
  const raw = Array.isArray(hit.brands) ? hit.brands : (hit.brands ?? "").split(",");
  return raw.map((brand) => brand.trim()).filter(Boolean);
}

function isRetailer(hit: Hit) {
  return RETAILER_OWNER.test(hit.owner ?? "") || (hit.brands_tags ?? []).some((brand) => RETAILER_BRAND.test(brand));
}

function pickBrand(hit: Hit) {
  const brands = brandList(hit);
  const [first, second] = brands;
  if (!first) return null;
  if (!GROUPS.has(slugify(first))) return first;
  if (second && !slugify(second).startsWith(slugify(first)) && slugify(second) !== "bio") return second;
  const name = (hit.product_name_fr ?? "").toLowerCase();
  return NAME_BRANDS.find(([needle]) => name.includes(needle))?.[1] ?? first;
}

const isUpperWord = (word: string) => /\p{Lu}/u.test(word) && word === word.toUpperCase();
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
const fold = (value: string) => slugify(value).replace(/-/g, " ");

// Contenance en fin de libellé (« 500 g », « 4x125g », « 450G/ »)
const TRAILING_QUANTITY = /[\s,-]*(\d+\s*[x×]\s*)?\d+([.,]\d+)?\s*(g|gr|kg|ml|cl|l)\b[./]?$/i;
// Abréviations et restes de libellés tronqués (« Boîte de », « le paquet de », « vrac », « eu »)
const TRAILING_NOISE = /[\s,–-]+(le paquet de|flacon de|bo[iî]te de|de|pet|eu|imp|frnl|vrac)$/i;

function endsWithBrand(value: string, brand: string) {
  const words = value.split(" ");
  const brandWords = brand.split(/\s+/).length;
  return words.length > brandWords + 1 && fold(words.slice(-brandWords).join(" ")) === fold(brand);
}

// Libellé lisible : sans la marque autour, sans contenance, sans MAJUSCULES criardes ni symboles
function cleanName(name: string, brands: string[], generic?: string) {
  let value = name
    .replace(/[\u200b-\u200d\ufeff®™©⁰¹²³⁴⁵⁶⁷⁸⁹]/g, "")
    .replace(/bio\*/gi, (match) => match.slice(0, -1))
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d+([.,]\d+)?\s*(g|kg|ml|cl|l)\s+/i, "");

  // Contenance, marque et restes en fin de libellé, jusqu'à stabilité
  for (let previous = ""; previous !== value; ) {
    previous = value;
    value = value.replace(TRAILING_QUANTITY, "").replace(TRAILING_NOISE, "").trim();
    const brand = brands.find((b) => endsWithBrand(value, b));
    if (brand) value = value.split(" ").slice(0, -brand.split(/\s+/).length).join(" ").replace(/[\s,–-]+$/, "");
  }

  for (const brand of brands) {
    const words = value.split(" ");
    const brandWords = brand.split(/\s+/).length;
    if (fold(words.slice(0, brandWords).join(" ")) !== fold(brand)) continue;
    const rest = words.slice(brandWords).join(" ").replace(/^[-–:,\s]+/, "");
    if (rest.split(" ").length >= 2 && rest.length >= 10) value = rest;
  }

  value = value
    .split(" ")
    .map((word) => (isUpperWord(word) && word.replace(/[^\p{L}]/gu, "").length >= 4 ? capitalize(word) : word))
    .join(" ");

  const single = value.split(" ").length < 2 || brands.some((brand) => fold(brand) === fold(value));
  if (single && generic && generic.length <= 70) value = generic.replace(/\.$/, "");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Une seule graphie par marque (« materne », « MATERNE » et « Materne » → « Materne »)
function brandDisplayNames(brands: string[]) {
  const variants = new Map<string, Map<string, number>>();
  for (const brand of brands) {
    const slug = slugify(brand);
    const counts = variants.get(slug) ?? new Map<string, number>();
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
    variants.set(slug, counts);
  }
  const names = new Map<string, string>();
  for (const [slug, counts] of variants) {
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([brand]) => brand);
    const mixed = ranked.find((brand) => brand !== brand.toUpperCase() && brand !== brand.toLowerCase());
    names.set(slug, BRAND_LABELS[slug] ?? mixed ?? ranked[0].split(" ").map(capitalize).join(" "));
  }
  return names;
}

// Nombre d'œufs lu dans le libellé (« 6 œufs bio ») ou dans une contenance nue (« 12 »)
function eggQuantity(hit: Hit) {
  if (!hit.categories_tags?.includes("en:eggs")) return null;
  const count =
    hit.product_name_fr?.match(/(\d+)\s*(?:gros |moyens |petits )?(?:oeufs|œufs)/i)?.[1] ??
    hit.quantity?.trim().match(/^(\d+)(?:\s*(?:oeufs|œufs|unités?))?$/i)?.[1];
  return count ? `${count} œufs` : null;
}

function imageUrl(code: string, rev: string) {
  const path = code.match(/^(\d{3})(\d{3})(\d{3})(\d+)$/)!.slice(1).join("/");
  return `https://images.openfoodfacts.org/images/products/${path}/front_fr.${rev}.400.jpg`;
}

function isJpeg(buffer: Buffer) {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

async function main() {
  const catalog: { barCode: string; categories: string[] }[] = JSON.parse(readFileSync(productsFile, "utf8"));
  const previous: { barCode: string }[] = existsSync(outputFile) ? JSON.parse(readFileSync(outputFile, "utf8")) : [];
  const previousCodes = new Set(previous.map((p) => p.barCode));
  const storeCodes = new Set(catalog.map((p) => String(p.barCode)).filter((code) => !previousCodes.has(code)));
  const catalogCategories = new Set(catalog.flatMap((p) => p.categories));

  const taxonomyRes = await fetchWithRetry(TAXONOMY_URL);
  if (!taxonomyRes) throw new Error("Taxonomie des catégories indisponible");
  const taxonomy = (await taxonomyRes.json()) as Record<string, { name?: { fr?: string }; synonyms?: { fr?: string[] } }>;
  // Noms et synonymes français, comparés sans tenir compte de la casse
  const norm = (value: string) => value.normalize("NFC").trim().toLowerCase();
  const frenchNames = (tag: string) => [taxonomy[tag]?.name?.fr, ...(taxonomy[tag]?.synonyms?.fr ?? [])].filter(Boolean) as string[];
  const tagOf = new Map<string, string>();
  for (const tag of Object.keys(taxonomy)) {
    for (const name of frenchNames(tag)) if (!tagOf.has(norm(name))) tagOf.set(norm(name), tag);
  }
  const catalogName = new Map([...catalogCategories].map((name) => [norm(name), name]));
  const frenchName = (tag: string) =>
    TAG_NAMES[tag] ?? frenchNames(tag).map((name) => catalogName.get(norm(name))).find(Boolean);

  // 1. Candidats par sous-rayon, du plus scanné au moins scanné
  const subs = RAYONS.flatMap((rayon) => rayon.subcategories.map((sub) => ({ rayon: rayon.slug, ...sub })));
  const candidates = new Map<string, Candidate>();
  const ranking = new Map<string, string[]>();
  for (const sub of subs) {
    const tag = SEARCH_TAGS[sub.category] ?? tagOf.get(norm(sub.category));
    if (!tag) {
      console.warn(`Pas d'étiquette Open Food Facts pour « ${sub.category} »`);
      continue;
    }
    const rules = RAYON_RULES[sub.rayon] ?? {};
    const key = `${sub.rayon}/${sub.slug}`;
    const codes: string[] = [];
    for (const hit of await search(tag)) {
      const tags = hit.categories_tags ?? [];
      const rev = officialFrontRev(hit);
      if (!rev || isRetailer(hit) || storeCodes.has(hit.code) || SKIPPED.has(hit.code) || !/^\d{13}$/.test(hit.code)) continue;
      if (!hit.product_name_fr?.trim() || !hit.quantity?.trim() || !pickBrand(hit)) continue;
      if (EXCLUDED_TAGS.some((t) => tags.includes(t))) continue;
      if (rules.exclude?.some((t) => tags.includes(t)) || (rules.require && !tags.includes(rules.require))) continue;
      const candidate = candidates.get(hit.code) ?? { hit, rev, subs: new Set<string>() };
      candidate.subs.add(key);
      candidates.set(hit.code, candidate);
      codes.push(hit.code);
    }
    ranking.set(key, codes);
    await sleep(SEARCH_DELAY_MS);
  }

  // 2. Jusqu'à PER_SUBCATEGORY produits par sous-rayon, PER_BRAND au plus par marque
  const selected = new Set<string>();
  for (const [key, codes] of ranking) {
    const inSub = () => [...selected].filter((code) => candidates.get(code)!.subs.has(key));
    for (const code of codes) {
      const current = inSub();
      if (current.length >= PER_SUBCATEGORY) break;
      if (selected.has(code)) continue;
      const brand = slugify(pickBrand(candidates.get(code)!.hit)!);
      if (current.filter((c) => slugify(pickBrand(candidates.get(c)!.hit)!) === brand).length >= PER_BRAND) continue;
      selected.add(code);
    }
  }

  const chosen = [...selected].map((code) => candidates.get(code)!);
  const brandNames = brandDisplayNames(chosen.map((c) => pickBrand(c.hit)!));
  const subCategory = new Map(subs.map((sub) => [`${sub.rayon}/${sub.slug}`, sub.category]));
  const subCategoryNames = new Set(subCategory.values());

  // 3. Photos, quelques-unes à la fois (le serveur d'images répond en plusieurs secondes)
  const missing = new Set<string>();
  const queue = chosen.filter(({ hit }) => !existsSync(join(imagesDir, `${hit.code}.jpg`)));
  console.log(`${chosen.length} produits retenus, ${queue.length} photos à télécharger`);
  let done = 0;
  await Promise.all(
    Array.from({ length: IMAGE_WORKERS }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        const res = await fetchWithRetry(imageUrl(item.hit.code, item.rev));
        const buffer = res ? Buffer.from(await res.arrayBuffer()) : null;
        if (buffer && isJpeg(buffer)) writeFileSync(join(imagesDir, `${item.hit.code}.jpg`), buffer);
        else missing.add(item.hit.code);
        if (++done % 50 === 0) console.log(`Photos : ${done}`);
        await sleep(IMAGE_DELAY_MS);
      }
    })
  );

  // 4. Fiches au format de data/complete_products.json
  const products = [];
  for (const { hit, rev, subs: productSubs } of chosen) {
    if (missing.has(hit.code)) {
      console.warn(`Photo indisponible : ${hit.code}`);
      continue;
    }
    const url = imageUrl(hit.code, rev);

    // Catégories connues du catalogue ; un sous-rayon n'est gardé que si le produit y a été retenu
    const ownSubs = new Set([...productSubs].map((key) => subCategory.get(key)!));
    const categories = new Set<string>(ownSubs);
    for (const tag of hit.categories_tags ?? []) {
      const name = frenchName(tag);
      if (name && (!subCategoryNames.has(name) || ownSubs.has(name))) categories.add(name);
    }

    const brand = brandNames.get(slugify(pickBrand(hit)!))!;
    const name = NAME_OVERRIDES[hit.code] ??
      cleanName(
        hit.product_name_fr!,
        [brand, ...brandList(hit)].filter((b) => !["bio", "nature", "organic"].includes(slugify(b))),
        hit.generic_name_fr?.trim()
      );
    products.push({
      name,
      barCode: hit.code,
      image_url: url,
      categories: [...categories],
      nutriscore: hit.nutriscore_grade && /^[a-e]$/.test(hit.nutriscore_grade) ? hit.nutriscore_grade : "unknown",
      brands: [brand],
      quantity: eggQuantity(hit) ?? hit.quantity!.trim(),
      description: hit.generic_name_fr?.trim() || name,
    });
  }

  writeFileSync(outputFile, JSON.stringify(products, null, 4) + "\n");
  console.log(`${products.length} produits de ${brandNames.size} marques écrits dans data/national-brands.json`);
  for (const [key, codes] of ranking) {
    const count = products.filter((p) => candidates.get(p.barCode)!.subs.has(key)).length;
    console.log(`  ${key.padEnd(42)} ${String(count).padStart(2)} produits (${codes.length} candidats)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
