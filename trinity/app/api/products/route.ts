import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isUserLoggedIn } from "@/services/auth/IsUserLoggedIn";

export async function GET(request: NextRequest) {
  const isLoggedIn = await isUserLoggedIn();
  console.log("isLoggedIn check: " + isLoggedIn);
  if (!isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
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

  try {
    const {
      name,
      price,
      description,
      nutriScore,
      picture,
      barCode,
      brandId,
      categoryId,
    } = await request.json();

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

    let barCodeBigInt: bigint;
    try {
      barCodeBigInt = BigInt(barCode);
    } catch (conversionError) {
      return NextResponse.json(
        { error: "Le champ barCode doit être un nombre valide" },
        { status: 400 }
      );
    }

    const createdProduct = await prisma.product.create({
      data: {
        name,
        price,
        description,
        nutriScore,
        picture,
        barCode: barCodeBigInt,
        categories: categoryId,
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
  } catch (error: any) {
    console.error("Erreur lors de la création du produit:", error);

    if (error.code === "P2002" && error.meta?.target?.includes("barCode")) {
      return NextResponse.json(
        { error: "Un produit avec ce barCode existe déjà." },
        { status: 409 }
      );
    }

    if (error.code === "P2003") {
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
