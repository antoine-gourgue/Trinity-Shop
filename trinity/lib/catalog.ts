import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatBrand } from "@/lib/format";
import {
  ListingParams,
  NUTRI_GRADES,
  PAGE_SIZE,
  PRICE_RANGES,
  SortValue,
} from "@/lib/catalog-options";

// Produits proposés à la vente : les produits masqués restent en base pour les commandes passées
export const VISIBLE_PRODUCT: Prisma.ProductWhereInput = { hidden: false };

const ORDER_BY: Record<SortValue, Prisma.ProductOrderByWithRelationInput[]> = {
  pertinence: [{ name: "asc" }, { id: "asc" }],
  nom: [{ name: "asc" }, { id: "asc" }],
  "prix-croissant": [{ price: "asc" }, { id: "asc" }],
  "prix-decroissant": [{ price: "desc" }, { id: "asc" }],
  nutriscore: [{ nutriScore: { sort: "asc", nulls: "last" } }, { name: "asc" }, { id: "asc" }],
};

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface ProductListing {
  products: Prisma.ProductGetPayload<{ include: { brand: true } }>[];
  total: number;
  page: number;
  pageCount: number;
  facets: {
    brands: FacetOption[];
    nutriScores: FacetOption[];
    promoCount: number;
  };
}

// Liste paginée et filtrée à partir d'une sélection de base (rayon, recherche…).
// Chaque facette est comptée sans son propre filtre pour rester cliquable.
export async function getProductListing(
  base: Prisma.ProductWhereInput,
  params: ListingParams,
  // Identifiants classés par pertinence (recherche texte), utilisés par le tri « pertinence »
  ranking?: string[]
): Promise<ProductListing> {
  base = { AND: [base, VISIBLE_PRODUCT] };
  const priceRange = PRICE_RANGES.find((range) => range.value === params.prix);

  const brandFilter: Prisma.ProductWhereInput = params.marques.length
    ? { brand: { name: { in: params.marques } } }
    : {};
  const nutriFilter: Prisma.ProductWhereInput = params.nutriscores.length
    ? { nutriScore: { in: params.nutriscores } }
    : {};
  const priceFilter: Prisma.ProductWhereInput = priceRange
    ? { price: { gte: priceRange.min, ...(priceRange.max ? { lt: priceRange.max } : {}) } }
    : {};
  const onPromo: Prisma.ProductWhereInput = { regularPrice: { not: null } };
  const promoFilter: Prisma.ProductWhereInput = params.promo ? onPromo : {};

  const where: Prisma.ProductWhereInput = { AND: [base, brandFilter, nutriFilter, priceFilter, promoFilter] };

  const [total, brandGroups, nutriGroups, promoCount] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.groupBy({
      by: ["brandId"],
      where: { AND: [base, nutriFilter, priceFilter, promoFilter] },
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["nutriScore"],
      where: { AND: [base, brandFilter, priceFilter, promoFilter] },
      _count: { _all: true },
    }),
    prisma.product.count({ where: { AND: [base, brandFilter, nutriFilter, priceFilter, onPromo] } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(params.page, pageCount);

  const [products, brands] = await Promise.all([
    params.tri === "pertinence" && ranking
      ? rankedPage(where, ranking, page)
      : prisma.product.findMany({
          where,
          orderBy: ORDER_BY[params.tri],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include: { brand: true },
        }),
    prisma.brand.findMany({
      where: { id: { in: brandGroups.map((group) => group.brandId) } },
      select: { id: true, name: true },
    }),
  ]);

  // Plusieurs lignes Brand peuvent porter le même nom : on agrège par nom
  const brandCounts = new Map<string, number>();
  for (const group of brandGroups) {
    const name = brands.find((brand) => brand.id === group.brandId)?.name;
    if (name) brandCounts.set(name, (brandCounts.get(name) ?? 0) + group._count._all);
  }

  return {
    products,
    total,
    page,
    pageCount,
    facets: {
      brands: [...brandCounts.entries()]
        .map(([value, count]) => ({ value, label: formatBrand(value), count }))
        .sort((a, b) => b.count - a.count),
      nutriScores: NUTRI_GRADES.map((grade) => ({
        value: grade,
        label: `Nutri-Score ${grade}`,
        count: nutriGroups.find((group) => group.nutriScore === grade)?._count._all ?? 0,
      })),
      promoCount,
    },
  };
}

// Page de résultats dans l'ordre du classement (Prisma ne sait pas trier sur une liste d'identifiants)
async function rankedPage(where: Prisma.ProductWhereInput, ranking: string[], page: number) {
  const position = new Map(ranking.map((id, index) => [id, index]));
  const byRank = (a: { id: string }, b: { id: string }) =>
    (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity);

  const matching = await prisma.product.findMany({ where, select: { id: true } });
  const pageIds = matching
    .sort(byRank)
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((product) => product.id);
  const products = await prisma.product.findMany({ where: { id: { in: pageIds } }, include: { brand: true } });
  return products.sort(byRank);
}
