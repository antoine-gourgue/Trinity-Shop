import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

// Magasin choisi par un visiteur non connecté (slug) ; un client connecté le garde sur son compte
export const STORE_COOKIE = "trinity-store";
export const STORE_COOKIE_MAX_AGE = 365 * 24 * 3600;

export const STORE_SELECT = {
  id: true,
  slug: true,
  name: true,
  street: true,
  zipCode: true,
  city: true,
  region: true,
  latitude: true,
  longitude: true,
  phone: true,
  hours: true,
} satisfies Prisma.StoreSelect;

export type StoreSummary = Prisma.StoreGetPayload<{ select: typeof STORE_SELECT }>;

// Magasin d'une commande au moment de la passer : celui du compte, sinon celui choisi avant la
// connexion (enregistré alors sur le compte, pour le paiement Stripe qui se termine sans cookie)
export async function storeForOrder(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { storeId: true } });
  if (user?.storeId) return user.storeId;

  const slug = (await cookies()).get(STORE_COOKIE)?.value;
  const store = slug ? await prisma.store.findUnique({ where: { slug }, select: { id: true } }) : null;
  if (!store) return null;
  await prisma.user.updateMany({ where: { id: userId, storeId: null }, data: { storeId: store.id } });
  return store.id;
}

// « Trinity Nantes Beaujoire, 2 route de Saint-Joseph, 44300 Nantes »
export function storeAddressLines(store: { street: string; zipCode: string; city: string }) {
  return [store.street, `${store.zipCode} ${store.city}`];
}
