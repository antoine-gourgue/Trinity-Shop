import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/site-url";

// Lien de désinscription des rappels de panier : il marche sans connexion, mais sa signature
// (HMAC du secret du site) empêche de désinscrire le compte de quelqu'un d'autre.
// Même secret que les sessions : NEXTAUTH_SECRET (auth.ts), sinon AUTH_SECRET, que NextAuth lit à défaut
function secret() {
  const value = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!value) throw new Error("NEXTAUTH_SECRET ou AUTH_SECRET est nécessaire pour signer les liens de désinscription.");
  return value;
}

export function unsubscribeSignature(userId: string) {
  return createHmac("sha256", secret()).update(`cart-reminders:${userId}`).digest("hex");
}

export function isValidUnsubscribeSignature(userId: string, signature: string) {
  const expected = Buffer.from(unsubscribeSignature(userId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: string) {
  const params = new URLSearchParams({ u: userId, s: unsubscribeSignature(userId) });
  return `${siteUrl()}/api/emails/unsubscribe?${params.toString()}`;
}
