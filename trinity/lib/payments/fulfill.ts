import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { parseSlotParam, slotToDate } from "@/lib/checkout";
import { placeOrder, type PlaceOrderError } from "@/lib/orders/place-order";
import { checkoutMetadataSchema, type CheckoutMetadata } from "@/lib/payments/stripe";

// Seuls les champs utilisés de Stripe : la page de retour et le webhook passent leurs objets complets
export type RefundClient = { refunds: Pick<Stripe["refunds"], "create"> };
export type PaidSession = Pick<Stripe.Checkout.Session, "id" | "payment_status" | "metadata" | "payment_intent">;

export type FulfillResult =
  | { ok: true; orderId: string; userId: string; created: boolean }
  | { ok: false; reason: "unpaid" | "invalid" | PlaceOrderError["code"]; metadata: CheckoutMetadata | null };

async function existingOrder(sessionId: string) {
  return prisma.order.findUnique({ where: { stripeSessionId: sessionId }, select: { id: true, userId: true } });
}

// Rembourse un paiement qui n'a pas pu devenir une commande (une seule fois par session)
async function refund(stripe: RefundClient, session: PaidSession) {
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (paymentIntent) {
    await stripe.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `refund-${session.id}` });
  }
}

// Transforme une session Stripe payée en commande. Appelée par la page de retour et par le webhook :
// une session ne crée qu'une commande, quel que soit l'ordre d'arrivée des deux appels
export async function fulfillCheckoutSession(stripe: RefundClient, session: PaidSession): Promise<FulfillResult> {
  const parsed = checkoutMetadataSchema.safeParse(session.metadata ?? {});
  const metadata = parsed.success ? parsed.data : null;
  if (session.payment_status !== "paid") return { ok: false, reason: "unpaid", metadata };

  const already = await existingOrder(session.id);
  if (already) return { ok: true, orderId: already.id, userId: already.userId, created: false };

  if (!metadata) {
    await refund(stripe, session);
    return { ok: false, reason: "invalid", metadata };
  }

  const slot = parseSlotParam(metadata.pickupSlot);
  try {
    const result = await placeOrder({
      userId: metadata.userId,
      cartId: metadata.cartId,
      pickupSlot: slot ? slotToDate(slot) : null,
      delivery: metadata.fulfillment === "delivery" ? { shippingAddressId: metadata.shippingAddressId } : null,
      loyaltyVouchers: metadata.loyaltyVouchers,
      stripeSessionId: session.id,
    });
    if (result.ok) return { ok: true, orderId: result.order.id, userId: result.order.userId, created: true };

    // Stock épuisé ou créneau complet entre le paiement et la commande : le client est remboursé
    await refund(stripe, session);
    return { ok: false, reason: result.error.code, metadata };
  } catch (error) {
    // Le webhook et la page de retour ont créé la commande au même moment : la seconde tentative s'efface
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const order = await existingOrder(session.id);
      if (order) return { ok: true, orderId: order.id, userId: order.userId, created: false };
    }
    throw error;
  }
}
