"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export type FavoriteResult = { ok: true; favorite: boolean } | { ok: false; error: "login" | "invalid" };

// Identifiants des produits favoris du client connecté (vide sans session)
export async function getMyFavoriteIds(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const favorites = await prisma.favorite.findMany({ where: { userId: session.user.id }, select: { productId: true } });
  return favorites.map((favorite) => favorite.productId);
}

// Ajoute le produit aux favoris, ou l'en retire s'il y était déjà
export async function toggleFavorite(productId: string): Promise<FavoriteResult> {
  const parsed = z.string().min(1).safeParse(productId);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "login" };

  const key = { userId_productId: { userId, productId: parsed.data } };
  const existing = await prisma.favorite.findUnique({ where: key, select: { userId: true } });
  if (existing) {
    await prisma.favorite.delete({ where: key });
  } else {
    const product = await prisma.product.findUnique({ where: { id: parsed.data }, select: { id: true } });
    if (!product) return { ok: false, error: "invalid" };
    await prisma.favorite.create({ data: { userId, productId: parsed.data } });
  }
  revalidatePath("/user/favoris");
  return { ok: true, favorite: !existing };
}
