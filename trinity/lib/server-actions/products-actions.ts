"use server";

import prisma from "@/lib/prisma";
import { nutriScore } from "@prisma/client";

export async function updateProduct(
  productId: string,
  name: string,
  price: number,
  barCode: bigint,
  description: string,
  nutriScoreValue: string | null,
  brandName: string,
  selectedCategories: string[]
) {
  const brand = await prisma.brand.findFirst({
    where: { name: brandName },
    select: { id: true },
  });

  if (!brand) throw new Error(`La marque "${brandName}" n'existe pas.`);

  const existingCategories = await prisma.category.findMany({
    where: {
      name: { in: selectedCategories },
    },
    select: { name: true },
  });

  const existingCategoryNames = existingCategories.map((c) => c.name);
  const invalidCategories = selectedCategories.filter(
    (c) => !existingCategoryNames.includes(c)
  );

  if (invalidCategories.length > 0) {
    throw new Error(
      `Certaines catégories n'existent pas: ${invalidCategories.join(", ")}`
    );
  }

  const currentCategories = await prisma.categoriesProducts.findMany({
    where: { productId },
    select: { categoryName: true },
  });

  const currentCategoryNames = currentCategories.map((c) => c.categoryName);

  const categoriesToConnect = selectedCategories.filter(
    (c) => !currentCategoryNames.includes(c)
  );
  const categoriesToDisconnect = currentCategoryNames.filter(
    (c) => !selectedCategories.includes(c)
  );

  const convertedNutriScore = nutriScoreValue
    ? (Object.values(nutriScore) as string[]).includes(
        nutriScoreValue.toUpperCase()
      )
      ? (nutriScoreValue.toUpperCase() as nutriScore)
      : null
    : null;

  return prisma.$transaction([
    prisma.categoriesProducts.deleteMany({
      where: {
        productId,
        categoryName: { in: categoriesToDisconnect },
      },
    }),

    ...categoriesToConnect.map((name) =>
      prisma.categoriesProducts.create({
        data: {
          productId,
          categoryName: name,
        },
      })
    ),

    prisma.product.update({
      where: { id: productId },
      data: {
        name,
        price,
        barCode,
        description,
        nutriScore:
          convertedNutriScore !== null ? convertedNutriScore : undefined,
        brandId: brand.id,
      },
    }),
  ]);
}

export async function getCategories() {
  return prisma.category.findMany({
    select: { name: true },
  });
}

export async function getProductCategories(productId: string) {
  return prisma.categoriesProducts.findMany({
    where: { productId },
    select: { categoryName: true },
  });
}

export async function deleteProduct(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        stock: true,
        cartsWithProduct: true,
        categories: true,
      },
    });

    if (!product) {
      throw new Error(`Le produit avec l'ID "${productId}" n'existe pas.`);
    }

    if (product.stock) {
      await prisma.stock.delete({
        where: { id: product.stock.id },
      });
    }

    if (product.cartsWithProduct.length > 0) {
      await prisma.productInCart.deleteMany({
        where: { productId: productId },
      });
    }

    if (product.categories.length > 0) {
      await prisma.categoriesProducts.deleteMany({
        where: { productId: productId },
      });
    }

    return await prisma.product.delete({
      where: { id: productId },
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du produit:", error);
    throw new Error("Échec de la suppression du produit.");
  }
}

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
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barCode}.json`, {
      cache: "no-store",
    });

    if (!res.ok) throw new Error("Erreur lors de la récupération des données OpenFoodFacts");
    const data = await res.json();
    return { openFoodData: data?.product || null, error: null };
  } catch (error) {
    return { openFoodData: null, error: (error as Error).message };
  }
}
