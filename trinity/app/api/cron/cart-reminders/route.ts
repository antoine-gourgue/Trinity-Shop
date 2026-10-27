import { NextRequest, NextResponse } from "next/server";
import { sendCartReminders } from "@/lib/cart-reminders";

// Tâche planifiée chaque après-midi (vercel.json) : rappels des paniers abandonnés.
// Vercel envoie CRON_SECRET dans l'en-tête Authorization.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await sendCartReminders());
}
