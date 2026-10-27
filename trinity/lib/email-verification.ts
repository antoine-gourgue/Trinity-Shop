import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { isValidSignature, sign } from "@/lib/signing";
import { siteUrl } from "@/lib/site-url";
import { emailSender } from "@/lib/email-sender";
import { VerifyEmailEmail } from "@/components/emails/verify-email-email";

const DAY = 86_400_000;
// Durée de validité du lien de confirmation
export const VERIFICATION_VALIDITY_DAYS = 7;

// L'adresse fait partie de la signature : un lien envoyé avant un changement d'adresse ne vaut plus
function payload(userId: string, email: string, expires: number) {
  return `verify-email:${userId}:${email}:${expires}`;
}

// Lien signé envoyé par e-mail ; il marche sans connexion, jusqu'à son expiration
export function verificationUrl(user: { id: string; email: string }, now = Date.now()) {
  const expires = now + VERIFICATION_VALIDITY_DAYS * DAY;
  const params = new URLSearchParams({ u: user.id, x: String(expires), s: sign(payload(user.id, user.email, expires)) });
  return `${siteUrl()}/api/account/verify-email?${params.toString()}`;
}

export type VerificationOutcome = "verified" | "expired" | "invalid";

// Confirme l'adresse du compte si le lien est authentique et encore valable
export async function confirmEmail(userId: string, expires: string, signature: string, now = new Date()): Promise<VerificationOutcome> {
  const expiresAt = Number(expires);
  if (!userId || !signature || !Number.isSafeInteger(expiresAt)) return "invalid";

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  if (!user || !isValidSignature(payload(userId, user.email, expiresAt), signature)) return "invalid";
  if (user.emailVerified) return "verified";
  if (expiresAt < now.getTime()) return "expired";

  // Condition sur l'adresse : elle a pu changer entre la lecture et l'écriture
  await prisma.user.updateMany({ where: { id: userId, email: user.email }, data: { emailVerified: now } });
  return "verified";
}

// E-mail de confirmation seul (nouvel envoi demandé, ou adresse modifiée), envoyé « au mieux »
export async function sendVerificationEmail(user: { id: string; email: string; firstName: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: emailSender(),
      to: [user.email],
      subject: "Confirmez votre adresse e-mail",
      react: VerifyEmailEmail({
        firstName: user.firstName,
        verifyUrl: verificationUrl(user),
        validityDays: VERIFICATION_VALIDITY_DAYS,
        siteUrl: siteUrl(),
      }),
    });
    if (error) {
      console.error("E-mail de confirmation d'adresse non envoyé :", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("E-mail de confirmation d'adresse non envoyé :", err);
    return false;
  }
}
