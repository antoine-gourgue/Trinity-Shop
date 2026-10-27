"use server";

import prisma from "@/lib/prisma";
import { OPEN_FACTS, fetchOpenFoodFactsProduct, type OpenFactsBase, type OpenFoodFactsProduct } from "@/lib/open-food-facts";

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

// Fiche Open Food Facts d'un produit ; pour un produit non alimentaire, Open Beauty Facts puis Open
// Products Facts. Source renvoyée pour la citer sous les informations.
export async function getOpenFoodFacts(
  barCode: string,
  nonFood = false
): Promise<{ openFoodData: OpenFoodFactsProduct | null; source: string; error: string | null }> {
  const bases: OpenFactsBase[] = nonFood ? ["beauty", "products"] : ["food"];
  try {
    for (const base of bases) {
      // Données produit stables : mises en cache 24 h pour ménager les API
      const openFoodData = await fetchOpenFoodFactsProduct(barCode, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) }, base);
      if (openFoodData) return { openFoodData, source: OPEN_FACTS[base].name, error: null };
    }
    return { openFoodData: null, source: OPEN_FACTS[bases[0]].name, error: null };
  } catch (error) {
    return { openFoodData: null, source: OPEN_FACTS[bases[0]].name, error: error instanceof Error ? error.message : "Open Food Facts indisponible" };
  }
}
