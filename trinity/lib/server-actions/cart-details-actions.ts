"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import { findRayonForCategories, rayonCategoryNames, RAYONS } from "@/lib/rayons";
import { currentStore } from "@/lib/current-store";
import { storeStockMap } from "@/lib/stock";
import { formatBestBefore, lotPricing } from "@/lib/anti-gaspi";

export interface CartItemDetails {
  brand: string | null;
  netContent: string | null;
  regularPrice: number | null;
  rayonSlug: string | null;
  // Quantité disponible dans le magasin du client (0 s'il n'y est pas), null sans magasin choisi
  stock: number | null;
  // Produit équivalent accepté en cas de rupture à la préparation
  allowSubstitute: boolean;
  // Offre anti-gaspi choisie : remise par unité, unités du lot et date limite ; inactive si le lot
  // n'est plus en vente dans le magasin du client (épuisé, date passée, autre magasin)
  antiGaspi: { percent: number; unitDiscount: number; lotQuantity: number; bestBefore: string; active: boolean } | null;
}

export interface CartSuggestion {
  id: string;
  name: string;
  price: number;
  regularPrice: number | null;
  netContent: string | null;
  picture: string;
  nutriScore: string | null;
  brand: string;
}

// Informations complémentaires des articles du panier (marque, contenance, prix barré, rayon)
// et suggestions « Vous avez oublié ? » tirées des mêmes rayons
export async function getCartDetails(productIds: string[]) {
  if (productIds.length === 0) {
    return { details: {} as Record<string, CartItemDetails>, suggestions: [] as CartSuggestion[] };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      regularPrice: true,
      netContent: true,
      brand: { select: { name: true } },
      categories: { select: { categoryName: true } },
    },
  });
  const store = await currentStore();
  const stock = store ? await storeStockMap(store.id, productIds) : null;

  // Préférences de remplacement des articles du panier actif du client
  const session = await auth();
  const items = session?.user?.id
    ? await prisma.productInCart.findMany({
        where: { productId: { in: productIds }, cart: { userId: session.user.id, archived: false } },
        select: {
          productId: true,
          allowSubstitute: true,
          product: { select: { price: true } },
          antiGaspiLot: { select: { id: true, storeId: true, quantity: true, bestBefore: true, closedAt: true, markdownDays: true } },
        },
      })
    : [];
  const substitutes = new Map(items.map((item) => [item.productId, item.allowSubstitute]));
  const antiGaspi = new Map(
    items.flatMap((item) => {
      if (!item.antiGaspiLot) return [];
      const lot = item.antiGaspiLot;
      const pricing = lot.storeId === store?.id ? lotPricing(lot, item.product.price) : null;
      return [
        [
          item.productId,
          {
            percent: pricing?.percent ?? 0,
            unitDiscount: pricing?.unitDiscount ?? 0,
            lotQuantity: lot.quantity,
            bestBefore: formatBestBefore(lot.bestBefore),
            active: !!pricing,
          },
        ] as const,
      ];
    })
  );

  const details: Record<string, CartItemDetails> = {};
  const rayonSlugs = new Set<string>();
  for (const product of products) {
    const match = findRayonForCategories(product.categories.map((c) => c.categoryName));
    if (match) rayonSlugs.add(match.rayon.slug);
    details[product.id] = {
      brand: product.brand?.name ?? null,
      netContent: product.netContent,
      regularPrice: product.regularPrice,
      rayonSlug: match?.rayon.slug ?? null,
      stock: stock ? (stock.get(product.id) ?? 0) : null,
      allowSubstitute: substitutes.get(product.id) ?? true,
      antiGaspi: antiGaspi.get(product.id) ?? null,
    };
  }

  const categoryNames = RAYONS.filter((r) => rayonSlugs.has(r.slug)).flatMap(rayonCategoryNames);
  const suggestions = categoryNames.length
    ? await prisma.product.findMany({
        where: {
          ...VISIBLE_PRODUCT,
          id: { notIn: productIds },
          categories: { some: { categoryName: { in: categoryNames } } },
        },
        // Les produits en promotion d'abord
        orderBy: [{ regularPrice: { sort: "desc", nulls: "last" } }, { name: "asc" }],
        take: 10,
        select: {
          id: true,
          name: true,
          price: true,
          regularPrice: true,
          netContent: true,
          picture: true,
          nutriScore: true,
          brand: { select: { name: true } },
        },
      })
    : [];

  return {
    details,
    suggestions: suggestions.map(({ brand, ...product }) => ({ ...product, brand: brand.name })),
  };
}

// Quelques promotions à proposer quand le panier est vide
export async function getPromoSuggestions(limit = 4): Promise<CartSuggestion[]> {
  const products = await prisma.product.findMany({
    where: { ...VISIBLE_PRODUCT, regularPrice: { not: null } },
    orderBy: [{ regularPrice: "desc" }, { name: "asc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      price: true,
      regularPrice: true,
      netContent: true,
      picture: true,
      nutriScore: true,
      brand: { select: { name: true } },
    },
  });
  return products.map(({ brand, ...product }) => ({ ...product, brand: brand.name }));
}
