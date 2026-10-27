"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// Le client active ou coupe les rappels de panier abandonné depuis son espace
export async function setCartReminders(enabled: boolean): Promise<{ ok: boolean }> {
  const parsed = z.boolean().safeParse(enabled);
  const session = await auth();
  if (!parsed.success || !session?.user?.id) return { ok: false };

  await prisma.user.update({ where: { id: session.user.id }, data: { cartReminders: parsed.data } });
  revalidatePath("/user/info");
  return { ok: true };
}
