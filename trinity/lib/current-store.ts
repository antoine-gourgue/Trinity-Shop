import { cache } from "react";
import { cookies } from "next/headers";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { STORE_COOKIE, STORE_SELECT, type StoreSummary } from "@/lib/stores";

// Magasin du visiteur : celui de son compte s'il est connecté, sinon celui de son cookie.
// Un magasin choisi avant la connexion rejoint le compte qui n'en avait pas.
// Mis en cache le temps d'une requête : l'habillage et la page le lisent sans requête en double.
export const currentStore = cache(async (): Promise<StoreSummary | null> => {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const userId = session?.user?.id;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { store: { select: STORE_SELECT } } });
    if (user?.store) return user.store;
  }

  const slug = cookieStore.get(STORE_COOKIE)?.value;
  if (!slug) return null;
  const store = await prisma.store.findUnique({ where: { slug }, select: STORE_SELECT });
  if (store && userId) {
    after(() => prisma.user.updateMany({ where: { id: userId, storeId: null }, data: { storeId: store.id } }));
  }
  return store;
});
