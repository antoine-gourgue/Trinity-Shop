"use server";

import { redirect } from "next/navigation";
import prisma from "../prisma";

async function getProductsWithScan(barcode: string) {
  return fetch(`https://us.openfoodfacts.org/api/v0/product/${barcode}`)
    .then((res) => res.json())
    .then((data) => data);
}

export const getOpenFoodFacts = async (barcode: string) => {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des données : ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 0) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération depuis Open Food Facts :", error);
    return null;
  }
};


export async function getProductRepository(barCode: string) {
  const product = await prisma.product.findUnique({
    where: { barCode: Number(barCode) },
  });

  if (product) {
    return redirect(`/product/${product.id}`);
  }

  const data = await getProductsWithScan(barCode);

  return data;
}
