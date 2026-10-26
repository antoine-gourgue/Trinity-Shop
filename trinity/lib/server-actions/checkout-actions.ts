"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// Adresses du client connecté pour la livraison à domicile (adresses de livraison d'abord)
export async function getMyAddresses() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    select: { id: true, type: true, street: true, zipCode: true, city: true, country: true },
    orderBy: { createdAt: "asc" },
  });
  return addresses.sort((a, b) => Number(b.type === "livraison") - Number(a.type === "livraison"));
}
