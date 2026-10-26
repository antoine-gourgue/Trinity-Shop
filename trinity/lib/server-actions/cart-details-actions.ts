"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import { findRayonForCategories, rayonCategoryNames, RAYONS } from "@/lib/rayons";

export interface CartItemDetails {
  brand: string | null;
  netContent: string | null;
  regularPrice: number | null;
  rayonSlug: string | null;
  // Quantité disponible en stock (0 si le produit n'a pas de stock)
  stock: number;
  // Produit équivalent accepté en cas de rupture à la préparation
  allowSubstitute: boolean;
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
      stock: { select: { quantity: true } },
    },
  });

  // Préférences de remplacement des articles du panier actif du client
  const session = await auth();
  const items = session?.user?.id
    ? await prisma.productInCart.findMany({
        where: { productId: { in: productIds }, cart: { userId: session.user.id, archived: false } },
        select: { productId: true, allowSubstitute: true },
      })
    : [];
  const substitutes = new Map(items.map((item) => [item.productId, item.allowSubstitute]));

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
      stock: product.stock?.quantity ?? 0,
      allowSubstitute: substitutes.get(product.id) ?? true,
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
