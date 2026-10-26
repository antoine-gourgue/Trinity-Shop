import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { after } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { appOrigin } from "@/lib/app-url";
import PasswordResetEmail from "@/components/password-reset-email";

// Durée de validité d'un lien de réinitialisation : 1 heure
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

// Les jetons sont rangés dans la table VerificationToken de NextAuth : le préfixe les sépare
// d'éventuels jetons de connexion par e-mail, que NextAuth range sous l'adresse seule
const IDENTIFIER_PREFIX = "password-reset:";

const resetIdentifier = (email: string) => `${IDENTIFIER_PREFIX}${email}`;

type ResetRecipient = { email: string; firstName: string };

// Seule l'empreinte du jeton est stockée : une fuite de la base ne donne aucun lien utilisable
export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Jeton de 32 octets aléatoires (64 caractères hexadécimaux), son empreinte et son expiration
export function createResetToken(now = new Date()) {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashResetToken(token),
    expires: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
  };
}

export function passwordResetUrl(email: string, token: string) {
  const params = new URLSearchParams({ token, email });
  return `${appOrigin()}/auth/reinitialiser?${params.toString()}`;
}

// Envoi « au mieux », comme l'e-mail de bienvenue : sans clé Resend, rien n'est envoyé
async function sendPasswordResetEmail(user: ResetRecipient, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      // En développement seulement, pour tester le parcours sans Resend
      console.info(`[mot de passe oublié] Lien de réinitialisation pour ${user.email} : ${resetUrl}`);
    } else {
      // Jamais le lien hors développement : il donne accès au compte
      console.warn("RESEND_API_KEY absente : e-mail de réinitialisation non envoyé.");
    }
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Trinity <no-reply@pioupiou.tech>",
      to: [user.email],
      subject: "Réinitialisez votre mot de passe Trinity",
      react: PasswordResetEmail({ firstName: user.firstName, resetUrl }),
    });
    if (error) console.error("E-mail de réinitialisation non envoyé :", error);
  } catch (err) {
    console.error("E-mail de réinitialisation non envoyé :", err);
  }
}

// Remplace le lien en cours du compte par un nouveau, puis l'envoie par e-mail
async function issueResetLink(user: ResetRecipient) {
  const identifier = resetIdentifier(user.email);
  const { token, tokenHash, expires } = createResetToken();

  await prisma.$transaction([
    // Un seul lien actif par adresse ; au passage, on purge les liens expirés des autres comptes
    prisma.verificationToken.deleteMany({
      where: {
        OR: [{ identifier }, { identifier: { startsWith: IDENTIFIER_PREFIX }, expires: { lt: new Date() } }],
      },
    }),
    prisma.verificationToken.create({ data: { identifier, token: tokenHash, expires } }),
  ]);

  await sendPasswordResetEmail(user, passwordResetUrl(user.email, token));
}

// Demande d'un lien de réinitialisation, appelée par la server action. Point d'accroche de la
// future limitation de débit : elle se branchera ici ou juste avant l'appel.
// Le résultat ne dépend jamais de l'existence du compte (pas d'énumération des comptes).
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { email: true, firstName: true },
  });
  if (!user) return;

  // Jeton et e-mail sont traités après la réponse : elle part aussi vite, qu'un compte existe ou non
  after(async () => {
    try {
      await issueResetLink(user);
    } catch (error) {
      console.error("Lien de réinitialisation non créé :", error);
    }
  });
}

async function findResetToken(identifier: string, tokenHash: string) {
  return prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier, token: tokenHash } },
    select: { expires: true },
  });
}

// Contrôle du lien à l'affichage de la page de réinitialisation (lecture seule)
export async function isPasswordResetLinkValid(email: string, token: string) {
  const record = await findResetToken(resetIdentifier(email), hashResetToken(token));
  return record !== null && record.expires > new Date();
}

// Change le mot de passe si le lien est valide et renvoie false sinon. Le jeton est consommé dans
// la même transaction que la mise à jour : un lien ne sert qu'une fois, même envoyé deux fois de suite.
export async function resetPassword({
  email,
  token,
  password,
}: {
  email: string;
  token: string;
  password: string;
}): Promise<boolean> {
  const identifier = resetIdentifier(email);
  const tokenHash = hashResetToken(token);

  const record = await findResetToken(identifier, tokenHash);
  if (!record) return false;
  if (record.expires <= new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier, token: tokenHash } });
    return false;
  }

  // Même hachage qu'à l'inscription
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.$transaction(async (tx) => {
    const consumed = await tx.verificationToken.deleteMany({
      where: { identifier, token: tokenHash, expires: { gt: new Date() } },
    });
    if (consumed.count === 0) return false;

    // Compte supprimé entre-temps : le jeton est consommé, rien d'autre ne change
    const updated = await tx.user.updateMany({ where: { email }, data: { password: passwordHash } });
    return updated.count > 0;
  });
}
