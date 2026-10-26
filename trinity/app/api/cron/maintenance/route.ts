import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { expirePromotions } from "@/lib/promotions";
import { purgeExpiredRateLimits } from "@/lib/rate-limit";

// Tâche planifiée chaque nuit par Vercel (vercel.json) : fin des promotions arrivées à échéance
// et purge des compteurs de tentatives. Vercel envoie CRON_SECRET dans l'en-tête Authorization.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ended = await expirePromotions();
  const { count: purged } = await purgeExpiredRateLimits();
  // Les prix ont changé : catalogue et fiches sont reconstruits
  if (ended.length > 0) revalidatePath("/", "layout");

  return NextResponse.json({ endedPromotions: ended.length, purgedRateLimits: purged });
}
