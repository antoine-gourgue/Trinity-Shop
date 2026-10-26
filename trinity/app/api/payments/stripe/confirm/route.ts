import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { stripeClient } from "@/lib/payments/stripe";
import { fulfillCheckoutSession } from "@/lib/payments/fulfill";
import { sendOrderConfirmation } from "@/lib/order-emails";

// Retour de Stripe après le paiement : la commande est créée, puis le client voit sa confirmation
export async function GET(request: NextRequest) {
  const stripe = stripeClient();
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const session = await auth();
  const userId = session?.user?.id;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));

  if (!stripe || !sessionId || !userId) return to("/cart");

  try {
    const checkout = await stripe.checkout.sessions.retrieve(sessionId);
    // Une session ne peut être confirmée que par le client qui l'a payée
    if (checkout.metadata?.userId !== userId) return to("/cart");

    const result = await fulfillCheckoutSession(stripe, checkout);
    if (result.ok) {
      if (result.created) after(() => sendOrderConfirmation(result.orderId));
      return to(`/user/${userId}/order/${result.orderId}?confirmation=1`);
    }

    const back = result.metadata?.returnPath ?? "/cart/paiement";
    return to(`${back}${back.includes("?") ? "&" : "?"}paiement=${result.reason}`);
  } catch (error) {
    console.error("Confirmation du paiement Stripe impossible :", error);
    return to("/cart");
  }
}
