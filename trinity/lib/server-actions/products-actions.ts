"use server";

import prisma from "@/lib/prisma";
import { fetchOpenFoodFactsProduct, type OpenFoodFactsProduct } from "@/lib/open-food-facts";

export async function getProductById(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        categories: {
          include: { category: true },
        },
      },
    });

    if (!product) throw new Error("Produit non trouvé");
    return { product, error: null };
  } catch (error) {
    return { product: null, error: error instanceof Error ? error.message : "Produit non trouvé" };
  }
}

export async function getOpenFoodFacts(
  barCode: string
): Promise<{ openFoodData: OpenFoodFactsProduct | null; error: string | null }> {
  try {
    // Données produit stables : mises en cache 24 h pour ménager l'API Open Food Facts
    const openFoodData = await fetchOpenFoodFactsProduct(barCode, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    return { openFoodData, error: null };
  } catch (error) {
    return { openFoodData: null, error: error instanceof Error ? error.message : "Open Food Facts indisponible" };
  }
}
