"use server";

import { z } from "zod";
import {
  forgotPasswordSchema,
  INVALID_RESET_LINK,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/schemas/passwordResetSchema";
import { requestPasswordReset, resetPassword } from "@/services/auth/passwordReset";
import { headers } from "next/headers";
import { RATE_LIMITS, clientIp, hitRateLimit } from "@/lib/rate-limit";

// Parcours « mot de passe oublié ». Ces actions sont publiques (l'utilisateur n'est pas connecté) :
// les données reçues sont toujours revalidées ici, quel que soit le contrôle fait dans le navigateur.

export type PasswordResetResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "Une erreur est survenue. Réessayez dans un instant.";

const fail = (error: string): PasswordResetResult => ({ ok: false, error });

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Données invalides.";
}

// Envoie un lien de réinitialisation. La réponse est la même qu'un compte existe ou non.
export async function requestPasswordResetAction(input: ForgotPasswordInput): Promise<PasswordResetResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  try {
    // Demandes limitées par adresse et par IP ; la limite s'applique qu'un compte existe ou non
    const ip = clientIp(await headers());
    const allowed =
      (await hitRateLimit(`reset:${parsed.data.email.toLowerCase()}`, RATE_LIMITS.resetEmail)) &&
      (await hitRateLimit(`reset-ip:${ip}`, RATE_LIMITS.resetIp));
    if (!allowed) return fail("Trop de demandes. Réessayez dans une heure.");

    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    console.error("Demande de réinitialisation impossible :", error);
    return fail(GENERIC_ERROR);
  }
  return { ok: true };
}

// Enregistre le nouveau mot de passe si le lien (jeton + adresse) est encore valable
export async function resetPasswordAction(input: ResetPasswordInput): Promise<PasswordResetResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { email, token, password } = parsed.data;

  try {
    if (!(await resetPassword({ email, token, password }))) return fail(INVALID_RESET_LINK);
  } catch (error) {
    console.error("Réinitialisation du mot de passe impossible :", error);
    return fail(GENERIC_ERROR);
  }
  return { ok: true };
}
