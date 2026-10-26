import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatBrand } from "@/lib/format";
import { parseQuantity } from "@/lib/product-info";
import {
  ListingParams,
  NUTRI_GRADES,
  PAGE_SIZE,
  PRICE_RANGES,
  SortValue,
} from "@/lib/catalog-options";

// Produits proposés à la vente : les produits masqués restent en base pour les commandes passées
export const VISIBLE_PRODUCT: Prisma.ProductWhereInput = { hidden: false };

// Marques du magasin, enregistrées sous forme de slug OpenFoodFacts (« u », « u-bio »…)
const STORE_BRAND: Prisma.ProductWhereInput = {
  brand: {
    OR: [
      { name: "u" },
      { name: { startsWith: "u-" } },
      { name: { in: ["hyper-u", "bien-vu", "mat-lou"] } },
    ],
  },
};

const GAMME_FILTERS: Record<string, Prisma.ProductWhereInput> = {
  u: STORE_BRAND,
  nationales: { NOT: STORE_BRAND },
};

// Bio : marque, nom ou catégorie qui le revendique (« U Bio », « 6 œufs BIO », « Fromages-bio »)
const ORGANIC: Prisma.ProductWhereInput = {
  OR: [
    { brand: { name: { contains: "bio", mode: "insensitive" } } },
    { name: { contains: "bio", mode: "insensitive" } },
    { categories: { some: { categoryName: { contains: "bio", mode: "insensitive" } } } },
  ],
};

const ORDER_BY: Record<SortValue, Prisma.ProductOrderByWithRelationInput[]> = {
  pertinence: [{ name: "asc" }, { id: "asc" }],
  nom: [{ name: "asc" }, { id: "asc" }],
  "prix-croissant": [{ price: "asc" }, { id: "asc" }],
  "prix-decroissant": [{ price: "desc" }, { id: "asc" }],
  // Trié en mémoire d'après la contenance (voir unitPricePage)
  "prix-kilo": [{ price: "asc" }, { id: "asc" }],
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
    bioCount: number;
    gammes: { u: number; nationales: number };
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
  const bioFilter: Prisma.ProductWhereInput = params.bio ? ORGANIC : {};
  const gammeFilter: Prisma.ProductWhereInput = params.gamme ? GAMME_FILTERS[params.gamme] : {};

  // Chaque facette est comptée avec tous les filtres sauf le sien
  const filters = { brandFilter, nutriFilter, priceFilter, promoFilter, bioFilter, gammeFilter };
  const except = (...skip: (keyof typeof filters)[]): Prisma.ProductWhereInput => ({
    AND: [base, ...Object.entries(filters).filter(([key]) => !skip.includes(key as keyof typeof filters)).map(([, f]) => f)],
  });
  const where = except();

  const [total, brandGroups, nutriGroups, promoCount, bioCount, storeCount, nationalCount] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.groupBy({ by: ["brandId"], where: except("brandFilter"), _count: { _all: true } }),
    prisma.product.groupBy({ by: ["nutriScore"], where: except("nutriFilter"), _count: { _all: true } }),
    prisma.product.count({ where: { AND: [except("promoFilter"), onPromo] } }),
    prisma.product.count({ where: { AND: [except("bioFilter"), ORGANIC] } }),
    prisma.product.count({ where: { AND: [except("gammeFilter"), GAMME_FILTERS.u] } }),
    prisma.product.count({ where: { AND: [except("gammeFilter"), GAMME_FILTERS.nationales] } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(params.page, pageCount);

  const [products, brands] = await Promise.all([
    params.tri === "pertinence" && ranking
      ? rankedPage(where, ranking, page)
      : params.tri === "prix-kilo"
        ? unitPricePage(where, page)
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
      bioCount,
      gammes: { u: storeCount, nationales: nationalCount },
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

// Tri au prix au kilo (ou au litre) : calculé depuis la contenance, produits sans contenance en dernier
async function unitPricePage(where: Prisma.ProductWhereInput, page: number) {
  const matching = await prisma.product.findMany({ where, select: { id: true, price: true, netContent: true, name: true } });
  const unitPrice = (product: { price: number; netContent: string | null }) => {
    const quantity = parseQuantity(product.netContent);
    return quantity ? product.price / quantity.amount : Infinity;
  };
  const sorted = matching
    .map((product) => ({ ...product, unit: unitPrice(product) }))
    .sort((a, b) => a.unit - b.unit || a.name.localeCompare(b.name, "fr"));
  const pageIds = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((product) => product.id);
  const position = new Map(pageIds.map((id, index) => [id, index]));
  const products = await prisma.product.findMany({ where: { id: { in: pageIds } }, include: { brand: true } });
  return products.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
}
