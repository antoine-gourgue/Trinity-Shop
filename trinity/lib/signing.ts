import { createHmac, timingSafeEqual } from "node:crypto";

// Signature des liens envoyés par e-mail (désinscription, confirmation d'adresse) : ils marchent sans
// connexion, mais personne ne peut en fabriquer un pour le compte de quelqu'un d'autre.
// Même secret que les sessions : NEXTAUTH_SECRET (auth.ts), sinon AUTH_SECRET, que NextAuth lit à défaut
function secret() {
  const value = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!value) throw new Error("NEXTAUTH_SECRET ou AUTH_SECRET est nécessaire pour signer les liens envoyés par e-mail.");
  return value;
}

export function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function isValidSignature(payload: string, signature: string) {
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
