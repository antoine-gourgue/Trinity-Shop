import { NextRequest, NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { stripeClient } from "@/lib/payments/stripe";
import { fulfillCheckoutSession } from "@/lib/payments/fulfill";
import { sendOrderConfirmation } from "@/lib/order-emails";

// Notifications Stripe : la commande est créée même si le client ne revient pas sur le site
// après avoir payé. Actif seulement si STRIPE_WEBHOOK_SECRET est défini.
export async function POST(request: NextRequest) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe webhooks are not configured" }, { status: 501 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // La signature porte sur le corps brut de la requête
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const result = await fulfillCheckoutSession(stripe, event.data.object);
    if (result.ok && result.created) after(() => sendOrderConfirmation(result.orderId));
  }
  return NextResponse.json({ received: true });
}
