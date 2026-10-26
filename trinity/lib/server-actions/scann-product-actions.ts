"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { isBarcode } from "@/lib/barcode";
import { fetchOpenFoodFactsProduct, type OpenFoodFactsProduct } from "@/lib/open-food-facts";

// Produit scanné : s'il est au catalogue, sa fiche s'ouvre ; sinon on renvoie la fiche
// Open Food Facts (produit que le drive ne vend pas), ou null s'il est inconnu
export async function findScannedProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  if (!isBarcode(barcode)) return null;

  const product = await prisma.product.findUnique({ where: { barCode: BigInt(barcode) }, select: { id: true } });
  if (product) redirect(`/product/${product.id}`);

  try {
    return await fetchOpenFoodFactsProduct(barcode);
  } catch (error) {
    console.error("Erreur lors de la récupération depuis Open Food Facts :", error);
    return null;
  }
}
