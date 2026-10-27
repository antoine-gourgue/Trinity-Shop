import Stripe from "stripe";
import { stripeClient, toCents } from "@/lib/payments/stripe";

export type RefundOutcome = { refunded: true; amount: number } | { refunded: false };

// Rembourse intégralement le paiement Stripe d'une commande annulée. La clé d'idempotence garantit
// un seul remboursement, même si l'annulation est relancée après une erreur.
export async function refundOrderPayment(stripeSessionId: string | null): Promise<RefundOutcome> {
  // Paiement simulé : rien n'a été débité
  if (!stripeSessionId) return { refunded: false };

  const stripe = stripeClient();
  if (!stripe) throw new Error("Stripe n'est pas configuré : le paiement ne peut pas être remboursé.");

  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntent) return { refunded: false };

  try {
    const refund = await stripe.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `refund-order-${stripeSessionId}` });
    // Stripe compte en centimes, le site en millièmes d'euro
    return { refunded: true, amount: refund.amount * 10 };
  } catch (error) {
    // Déjà remboursé (depuis le tableau de bord Stripe, par exemple) : l'annulation peut continuer
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "charge_already_refunded") {
      return { refunded: true, amount: (session.amount_total ?? 0) * 10 };
    }
    throw error;
  }
}

// Remboursement partiel d'une commande préparée (articles manquants, remplaçants moins chers).
// Montant en millièmes d'euro ; une seule fois par commande grâce à la clé d'idempotence.
export async function refundPreparation(stripeSessionId: string | null, amount: number): Promise<RefundOutcome> {
  // Paiement simulé, ou rien à rendre
  if (!stripeSessionId || toCents(amount) <= 0) return { refunded: false };

  const stripe = stripeClient();
  if (!stripe) throw new Error("Stripe n'est pas configuré : la différence ne peut pas être remboursée.");

  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntent) return { refunded: false };

  // Plafonné au montant débité, au cas où les prix du catalogue auraient changé depuis le paiement
  const cents = Math.min(toCents(amount), session.amount_total ?? 0);
  if (cents <= 0) return { refunded: false };
  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntent, amount: cents },
    { idempotencyKey: `refund-preparation-${stripeSessionId}` }
  );
  return { refunded: true, amount: refund.amount * 10 };
}
