import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isValidUnsubscribeSignature } from "@/lib/email-preferences";

// Désinscription des rappels de panier, sans connexion, grâce au lien signé de l'e-mail
async function unsubscribe(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("u") ?? "";
  const signature = request.nextUrl.searchParams.get("s") ?? "";
  if (!userId || !signature || !isValidUnsubscribeSignature(userId, signature)) return false;

  await prisma.user.updateMany({ where: { id: userId }, data: { cartReminders: false } });
  return true;
}

// Clic sur le lien de l'e-mail : page de confirmation
export async function GET(request: NextRequest) {
  const done = await unsubscribe(request);
  return NextResponse.redirect(new URL(`/legal/desabonnement${done ? "" : "?erreur=1"}`, request.nextUrl.origin));
}

// Bouton « Se désabonner » des messageries (RFC 8058) : réponse simple, sans redirection
export async function POST(request: NextRequest) {
  const done = await unsubscribe(request);
  return NextResponse.json({ unsubscribed: done }, { status: done ? 200 : 400 });
}
