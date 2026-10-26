"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const substitutionSchema = z.object({ productId: z.string().min(1), allow: z.boolean() });

// Le client accepte ou refuse un produit équivalent pour un article de son panier actif
export async function setAllowSubstitute(productId: string, allow: boolean): Promise<{ ok: boolean }> {
  const parsed = substitutionSchema.safeParse({ productId, allow });
  const session = await auth();
  if (!parsed.success || !session?.user?.id) return { ok: false };

  const { count } = await prisma.productInCart.updateMany({
    where: { productId: parsed.data.productId, cart: { userId: session.user.id, archived: false } },
    data: { allowSubstitute: parsed.data.allow },
  });
  return { ok: count > 0 };
}
