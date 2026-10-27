"use server";

import prisma from "@/lib/prisma";
import { isBarcode } from "@/lib/barcode";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import { currentStore } from "@/lib/current-store";
import { fetchCategoryTaxonomy, fetchOpenFoodFactsProduct, type CategoryTaxonomy, type OpenFoodFactsProduct } from "@/lib/open-food-facts";
import { findRayonForCategories, rayonHref, slugify } from "@/lib/rayons";
import { catalogCategoriesFor, toScannedProduct, type ScannedProduct } from "@/lib/scanned-product";
import { searchTerms } from "@/lib/search";
import { withStorePrices } from "@/lib/store-prices";

export interface SimilarProduct {
  id: string;
  name: string;
  brand: string;
  picture: string;
  price: number;
  regularPrice: number | null;
  netContent: string | null;
}

export type ScanResult =
  // Produit du catalogue : le scanner ouvre sa fiche
  | { kind: "catalog"; productId: string }
  // Produit que le drive ne vend pas, décrit par Open Food Facts ou une de ses bases sœurs, avec des
  // produits du catalogue de la même catégorie et leur rayon
  | { kind: "external"; product: ScannedProduct; similar: SimilarProduct[]; rayon: { name: string; href: string } | null }
  | { kind: "unknown" }
  // Code lu qui n'est pas un code-barres de produit (QR code, code tronqué)
  | { kind: "invalid" };

const SIMILAR_PRODUCTS = 4;
// Produits lus par catégorie, parmi lesquels on retient les plus proches du produit scanné
const CANDIDATES = 24;

// Produit scanné. Pas de redirect() ici : appelée depuis le navigateur, l'action le transmettait
// comme une exception, que le scanner affichait en erreur avant d'ouvrir la fiche. Le scanner
// navigue lui-même vers la fiche d'un produit du catalogue.
export async function findScannedProduct(barcode: string): Promise<ScanResult> {
  if (!isBarcode(barcode)) return { kind: "invalid" };

  const product = await prisma.product.findUnique({ where: { barCode: BigInt(barcode) }, select: { id: true } });
  if (product) return { kind: "catalog", productId: product.id };

  // Produit que le drive ne vend pas : Open Food Facts, puis ses bases sœurs (hygiène, entretien)
  for (const base of ["food", "beauty", "products"] as const) {
    let external: OpenFoodFactsProduct | null;
    try {
      external = await fetchOpenFoodFactsProduct(barcode, undefined, base);
    } catch (error) {
      console.error(`Erreur lors de la récupération depuis ${base} :`, error);
      continue;
    }
    if (!external) continue;

    // Sans produits proches, la fiche reste utile
    const scanned = toScannedProduct(barcode, external, base);
    const alternatives = await catalogAlternatives(external, scanned).catch((error: unknown): Alternatives => {
      console.error("Produits proches indisponibles :", error);
      return { similar: [], rayon: null };
    });
    return { kind: "external", product: scanned, ...alternatives };
  }
  return { kind: "unknown" };
}

type Alternatives = Pick<Extract<ScanResult, { kind: "external" }>, "similar" | "rayon">;

// Produits du catalogue à proposer à la place, en stock dans le magasin du client : ceux de la
// catégorie la plus précise d'abord (celle qui compte le moins de produits), puis des plus larges ;
// dans chaque catégorie, ceux dont le nom partage le plus de mots avec le produit scanné, puis sa marque
async function catalogAlternatives(product: OpenFoodFactsProduct, scanned: ScannedProduct): Promise<Alternatives> {
  const tags = product.categories_tags ?? [];
  if (!tags.length) return { similar: [], rayon: null };

  const [taxonomy, groups, store] = await Promise.all([
    // Sans la taxonomie, les étiquettes reconnues par leur nom suffisent
    fetchCategoryTaxonomy(tags, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) }).catch((): CategoryTaxonomy => ({})),
    prisma.categoriesProducts.groupBy({ by: ["categoryName"], where: { product: VISIBLE_PRODUCT }, _count: { _all: true } }),
    currentStore(),
  ]);
  const counts = new Map(groups.map((group) => [group.categoryName, group._count._all]));
  const categories = catalogCategoriesFor(tags, taxonomy, [...counts.keys()]).sort(
    (a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0)
  );

  const words = new Set(searchTerms(scanned.name).filter((term) => term.length > 2));
  const brand = scanned.brand && slugify(scanned.brand);
  const closeness = (candidate: { name: string; brand: { name: string } }) =>
    2 * searchTerms(candidate.name).filter((term) => words.has(term)).length + (brand && slugify(candidate.brand.name) === brand ? 1 : 0);

  const similar: SimilarProduct[] = [];
  for (const category of categories) {
    if (similar.length >= SIMILAR_PRODUCTS) break;
    const found = await prisma.product.findMany({
      where: {
        AND: [
          VISIBLE_PRODUCT,
          { categories: { some: { categoryName: category } } },
          { id: { notIn: similar.map((item) => item.id) } },
          store ? { stocks: { some: { storeId: store.id, quantity: { gt: 0 } } } } : {},
        ],
      },
      select: { id: true, name: true, picture: true, price: true, regularPrice: true, netContent: true, brand: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: CANDIDATES,
    });
    const closest = found.sort((a, b) => closeness(b) - closeness(a)).slice(0, SIMILAR_PRODUCTS - similar.length);
    similar.push(...closest.map(({ brand, ...item }) => ({ ...item, brand: brand.name })));
  }

  // Rayon de la catégorie la plus précise qui en a un
  const match = categories.map((category) => findRayonForCategories([category])).find(Boolean);
  const rayon = match
    ? { name: match.subCategory?.label ?? match.rayon.name, href: rayonHref(match.rayon, match.subCategory?.slug) }
    : null;
  return { similar: await withStorePrices(similar, store?.id), rayon };
}
