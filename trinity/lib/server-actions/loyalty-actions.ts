"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateCardNumber } from "@/lib/loyalty";

// Active la Carte Trinity de l'utilisateur connecté (sans effet si elle existe déjà)
export async function activateLoyaltyCard() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Connectez-vous pour activer votre carte." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { loyaltyNumber: true },
  });
  if (!user) return { error: "Compte introuvable." };
  if (user.loyaltyNumber) return { number: user.loyaltyNumber };

  // Numéro aléatoire : on vérifie qu'il n'est pas déjà attribué
  let number = generateCardNumber();
  while (await prisma.user.findFirst({ where: { loyaltyNumber: number }, select: { id: true } })) {
    number = generateCardNumber();
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { loyaltyNumber: number, loyaltyJoinedAt: new Date() },
  });
  revalidatePath("/user");
  revalidatePath("/user/fidelite");
  return { number };
}

// Carte et solde de l'utilisateur connecté, pour le parcours de commande
export async function getLoyaltySummary() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { loyaltyNumber: true, loyaltyPoints: true },
  });
  return user?.loyaltyNumber ? { number: user.loyaltyNumber, points: user.loyaltyPoints } : null;
}
