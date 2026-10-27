import prisma from "@/lib/prisma";

// Limitation des tentatives (connexion, inscription, mot de passe oublié, confirmation d'e-mail), comptées en base :
// sur Vercel, chaque requête peut tourner sur une instance différente, la mémoire ne suffit pas
export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

const MINUTE = 60_000;

export const RATE_LIMITS = {
  signinEmail: { limit: 8, windowMs: 15 * MINUTE },
  signinIp: { limit: 30, windowMs: 15 * MINUTE },
  signupIp: { limit: 5, windowMs: 60 * MINUTE },
  resetEmail: { limit: 3, windowMs: 60 * MINUTE },
  resetIp: { limit: 10, windowMs: 60 * MINUTE },
  verifyEmail: { limit: 3, windowMs: 60 * MINUTE },
} satisfies Record<string, RateLimitRule>;

// Compte une tentative pour la clé ; false si la limite de la fenêtre en cours est déjà atteinte
export async function hitRateLimit(key: string, rule: RateLimitRule, now = new Date()): Promise<boolean> {
  const current = await prisma.rateLimit.findUnique({ where: { key } });
  if (!current || current.resetAt <= now) {
    const resetAt = new Date(now.getTime() + rule.windowMs);
    await prisma.rateLimit.upsert({ where: { key }, create: { key, count: 1, resetAt }, update: { count: 1, resetAt } });
    return true;
  }
  if (current.count >= rule.limit) return false;
  await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}

export async function clearRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

// Fenêtres terminées, supprimées par la tâche de maintenance
export function purgeExpiredRateLimits(now = new Date()) {
  return prisma.rateLimit.deleteMany({ where: { resetAt: { lte: now } } });
}

// Adresse IP du client, posée par Vercel dans x-forwarded-for ; « local » hors Vercel
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
