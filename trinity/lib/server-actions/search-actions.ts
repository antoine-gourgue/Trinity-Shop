"use server";

import prisma from "@/lib/prisma";
import { RAYONS, rayonHref } from "@/lib/rayons";
import { searchProductIds, searchTerms } from "@/lib/search";
import { currentStore } from "@/lib/current-store";
import { withStorePrices } from "@/lib/store-prices";

export interface SearchSuggestions {
  total: number;
  rayons: { label: string; parent: string | null; href: string }[];
  products: {
    id: string;
    name: string;
    brand: string;
    picture: string;
    price: number;
    regularPrice: number | null;
    netContent: string | null;
  }[];
}

const MAX_PRODUCTS = 6;
const MAX_RAYONS = 3;

// Suggestions affichées sous la barre de recherche pendant la frappe
export async function getSearchSuggestions(query: string): Promise<SearchSuggestions> {
  const terms = searchTerms(query);
  if (!terms.length) return { total: 0, rayons: [], products: [] };

  // Rayons et sous-rayons dont le nom contient tous les mots tapés
  const matches = (label: string) => {
    const words = searchTerms(label).join(" ");
    return terms.every((term) => words.includes(term));
  };
  const rayons = RAYONS.flatMap((rayon) => [
    ...(matches(rayon.name) ? [{ label: rayon.name, parent: null, href: rayonHref(rayon) }] : []),
    ...rayon.subcategories
      .filter((sub) => matches(sub.label))
      .map((sub) => ({ label: sub.label, parent: rayon.shortName, href: rayonHref(rayon, sub.slug) })),
  ]).slice(0, MAX_RAYONS);

  const ids = await searchProductIds(query);
  const top = ids.slice(0, MAX_PRODUCTS);
  const found = top.length
    ? await prisma.product.findMany({
        where: { id: { in: top } },
        select: {
          id: true,
          name: true,
          picture: true,
          price: true,
          regularPrice: true,
          netContent: true,
          brand: { select: { name: true } },
        },
      })
    : [];
  const position = new Map(top.map((id, index) => [id, index]));

  // Prix du magasin du client (prospectus en cours)
  const store = await currentStore();
  return {
    total: ids.length,
    rayons,
    products: await withStorePrices(
      found.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)).map(({ brand, ...product }) => ({ ...product, brand: brand.name })),
      store?.id
    ),
  };
}
