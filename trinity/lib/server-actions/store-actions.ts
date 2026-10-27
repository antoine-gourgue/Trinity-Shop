"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { STORE_COOKIE, STORE_COOKIE_MAX_AGE, STORE_SELECT, type StoreSummary } from "@/lib/stores";

// Tous les magasins, pour la fenêtre de choix (chargés à son ouverture)
export async function listStores(): Promise<StoreSummary[]> {
  return prisma.store.findMany({ select: STORE_SELECT, orderBy: [{ city: "asc" }, { name: "asc" }] });
}

export type ChooseStoreResult = { ok: true; store: StoreSummary } | { ok: false; error: string };

// Choix du magasin : gardé dans un cookie, et sur le compte du client connecté
export async function chooseStore(slug: string): Promise<ChooseStoreResult> {
  const parsed = z.string().min(1).max(80).safeParse(slug);
  if (!parsed.success) return { ok: false, error: "Magasin inconnu." };
  const store = await prisma.store.findUnique({ where: { slug: parsed.data }, select: STORE_SELECT });
  if (!store) return { ok: false, error: "Magasin inconnu." };

  (await cookies()).set(STORE_COOKIE, store.slug, { maxAge: STORE_COOKIE_MAX_AGE, path: "/", sameSite: "lax" });
  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({ where: { id: session.user.id }, data: { storeId: store.id } });
  }
  revalidatePath("/", "layout");
  return { ok: true, store };
}
