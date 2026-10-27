import { NextRequest, NextResponse } from "next/server";
import { sendCartReminders } from "@/lib/cart-reminders";
import { sendFavoritePromoAlerts } from "@/lib/favorite-promos";

// Tâche planifiée chaque après-midi (vercel.json) : rappels des paniers abandonnés et alertes
// des favoris passés en promotion. Vercel envoie CRON_SECRET dans l'en-tête Authorization.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cartReminders = await sendCartReminders();
  const favoritePromos = await sendFavoritePromoAlerts();
  return NextResponse.json({ cartReminders, favoritePromos });
}
