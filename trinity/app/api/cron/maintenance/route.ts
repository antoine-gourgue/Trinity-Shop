import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { expirePromotions } from "@/lib/promotions";
import { purgeExpiredRateLimits } from "@/lib/rate-limit";
import { autoReplenish, receiveOverdueRestocks, withdrawExpiredLots } from "@/lib/stock-maintenance";

// Les tâches de stock portent sur tout le réseau
export const maxDuration = 60;

// Tâche planifiée chaque nuit par Vercel (vercel.json) : fin des promotions arrivées à échéance,
// purge des compteurs de tentatives, puis stock (lots périmés retirés de la vente, livraisons non
// réceptionnées entrées en stock, réassort automatique). Vercel envoie CRON_SECRET dans l'en-tête
// Authorization.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ended = await expirePromotions();
  const { count: purged } = await purgeExpiredRateLimits();
  const withdrawnLots = await withdrawExpiredLots();
  const receivedRestocks = await receiveOverdueRestocks();
  const restockOrders = await autoReplenish();
  // Prix et stocks ont changé : catalogue et fiches sont reconstruits
  if (ended.length > 0 || withdrawnLots > 0 || receivedRestocks > 0) revalidatePath("/", "layout");

  return NextResponse.json({ endedPromotions: ended.length, purgedRateLimits: purged, withdrawnLots, receivedRestocks, restockOrders });
}
