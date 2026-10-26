"use server";

import prisma from "@/lib/prisma";

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
    return { product: null, error: (error as Error).message };
  }
}

export async function getOpenFoodFacts(barCode: string) {
  try {
    // Données produit stables : mises en cache 24 h pour ménager l'API OpenFoodFacts
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barCode}.json`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error("Erreur lors de la récupération des données OpenFoodFacts");
    const data = await res.json();
    return { openFoodData: data?.product || null, error: null };
  } catch (error) {
    return { openFoodData: null, error: (error as Error).message };
  }
}
