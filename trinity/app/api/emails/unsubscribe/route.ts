import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isEmailTopic, isValidUnsubscribeSignature, topicSetting, type EmailTopic } from "@/lib/email-preferences";

// Désinscription d'un type d'e-mail (rappels de panier, alertes promo), sans connexion, grâce au lien
// signé de l'e-mail. Le type d'e-mail concerné, ou null si le lien n'est pas valable.
async function unsubscribe(request: NextRequest): Promise<EmailTopic | null> {
  const params = request.nextUrl.searchParams;
  const userId = params.get("u") ?? "";
  const signature = params.get("s") ?? "";
  // Les premiers liens ne précisaient pas le type : c'étaient des rappels de panier
  const topic = params.get("t") ?? "cart-reminders";
  if (!userId || !signature || !isEmailTopic(topic) || !isValidUnsubscribeSignature(userId, topic, signature)) return null;

  await prisma.user.updateMany({ where: { id: userId }, data: topicSetting(topic, false) });
  return topic;
}

// Clic sur le lien de l'e-mail : page de confirmation
export async function GET(request: NextRequest) {
  const topic = await unsubscribe(request);
  const query = topic ? `?type=${topic}` : "?erreur=1";
  return NextResponse.redirect(new URL(`/legal/desabonnement${query}`, request.nextUrl.origin));
}

// Bouton « Se désabonner » des messageries (RFC 8058) : réponse simple, sans redirection
export async function POST(request: NextRequest) {
  const topic = await unsubscribe(request);
  return NextResponse.json({ unsubscribed: topic !== null }, { status: topic ? 200 : 400 });
}
