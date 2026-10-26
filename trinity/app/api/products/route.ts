import { z } from "zod";
import { nutriScore as NutriScore } from "@prisma/client";
import prisma from "@/lib/prisma";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import { NextRequest, NextResponse } from "next/server";
import { isUserLoggedIn } from "@/services/auth/IsUserLoggedIn";
import { isAdmin } from "@/services/auth/guards";
import { optionalField, readJsonBody } from "@/lib/api";
import { isBarcode } from "@/lib/barcode";

// Produit envoyé par l'administration ; chaque champ manquant ou invalide déclenche le même message
const productBodySchema = z.object({
  name: optionalField(z.string().min(1)),
  price: optionalField(z.number().int().positive()),
  description: optionalField(z.string().min(1)),
  nutriScore: optionalField(z.nativeEnum(NutriScore)),
  picture: optionalField(z.string().min(1)),
  barCode: optionalField(z.union([z.string(), z.number()])),
  brandId: optionalField(z.string().min(1)),
  categoryId: optionalField(z.string().min(1)),
});

export async function GET() {
  const isLoggedIn = await isUserLoggedIn();
  console.log("isLoggedIn check: " + isLoggedIn);
  if (!isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      where: VISIBLE_PRODUCT,
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        picture: true,
        nutriScore: true,
        categories: true,
        brand: {
          select: {
            name: true,
          },
        },
      },
    });
    return NextResponse.json({ data: products });
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const isLoggedIn = await isUserLoggedIn();
  console.log("isLoggedIn check: " + isLoggedIn);
  if (!isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await readJsonBody(request, productBodySchema);
    const { name, price, description, nutriScore, picture, barCode, brandId, categoryId } = body ?? {};

    if (
      !name ||
      !price ||
      !description ||
      !nutriScore ||
      !picture ||
      !barCode ||
      !brandId ||
      !categoryId
    ) {
      return NextResponse.json(
        { error: "Tous les champs sont obligatoires" },
        { status: 400 }
      );
    }

    // Code GTIN : évite aussi un BigInt négatif ou hors limites
    const barCodeText = String(barCode).trim();
    if (!isBarcode(barCodeText)) {
      return NextResponse.json(
        { error: "Le champ barCode doit être un nombre valide" },
        { status: 400 }
      );
    }
    const barCodeBigInt = BigInt(barCodeText);

    const createdProduct = await prisma.product.create({
      data: {
        name,
        price,
        description,
        nutriScore,
        picture,
        barCode: barCodeBigInt,
        categories: { create: { category: { connect: { id: categoryId } } } },
        brand: {
          connect: { id: brandId },
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        picture: true,
        nutriScore: true,
        barCode: true,
        categories: true,
        brand: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    const serializedProduct = {
      ...createdProduct,
      barCode: createdProduct.barCode.toString(),
    };

    return NextResponse.json({ data: serializedProduct }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du produit:", error);

    // Erreurs Prisma connues : contrainte d'unicité (P2002), clé étrangère (P2003)
    const { code, meta } = (error ?? {}) as { code?: string; meta?: { target?: string | string[] } };

    if (code === "P2002" && meta?.target?.includes("barCode")) {
      return NextResponse.json(
        { error: "Un produit avec ce barCode existe déjà." },
        { status: 409 }
      );
    }

    if (code === "P2003") {
      return NextResponse.json(
        { error: "brandId ou categoryId invalide." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
