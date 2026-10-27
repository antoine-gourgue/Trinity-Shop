"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { sendVerificationEmail } from "@/lib/email-verification";
import { RATE_LIMITS, hitRateLimit } from "@/lib/rate-limit";

export type ResendVerificationResult = { ok: true } | { ok: false; error: string };

// Nouvel envoi du lien de confirmation, demandé depuis l'espace client (trois par heure au plus)
export async function resendVerificationEmail(): Promise<ResendVerificationResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Connectez-vous pour confirmer votre adresse." };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, emailVerified: true } });
  if (!user) return { ok: false, error: "Compte introuvable." };
  if (user.emailVerified) return { ok: true };

  if (!(await hitRateLimit(`verify-email:${userId}`, RATE_LIMITS.verifyEmail))) {
    return { ok: false, error: "Trop de demandes : réessayez dans une heure." };
  }
  if (!(await sendVerificationEmail(user))) return { ok: false, error: "L’e-mail n’a pas pu être envoyé. Réessayez dans un instant." };
  return { ok: true };
}
