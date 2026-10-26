import Stripe from "stripe";
import { z } from "zod";

let client: Stripe | null | undefined;

// Client Stripe, ou null sans clé configurée : le site garde alors le paiement simulé
export function stripeClient(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    client = key ? new Stripe(key) : null;
  }
  return client;
}

// Prix stockés en millièmes d'euro, Stripe compte en centimes
export function toCents(amount: number) {
  return Math.round(amount / 10);
}

// Informations de commande portées par la session Stripe (Stripe ne stocke que des chaînes)
export const checkoutMetadataSchema = z.object({
  userId: z.string().min(1),
  cartId: z.string().min(1),
  pickupSlot: z.string().min(1),
  fulfillment: z.enum(["pickup", "delivery"]),
  shippingAddressId: z.string().min(1).optional(),
  loyaltyVouchers: z.coerce.number().int().min(0),
  returnPath: z.string().regex(/^\/cart\/paiement(\?.*)?$/),
});

export type CheckoutMetadata = z.infer<typeof checkoutMetadataSchema>;
