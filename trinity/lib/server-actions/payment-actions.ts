"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { parseSlotParam, slotToDate } from "@/lib/checkout";
import { deliveryFee } from "@/lib/delivery";
import { VOUCHER_VALUE, maxVouchers } from "@/lib/loyalty";
import { absoluteUrl, siteUrl } from "@/lib/site-url";
import { cartTotal, checkAvailability } from "@/lib/orders/place-order";
import { orderFailureMessage } from "@/lib/orders/order-messages";
import { stripeClient, toCents, type CheckoutMetadata } from "@/lib/payments/stripe";
import { storeForOrder } from "@/lib/stores";
import { cartAntiGaspi } from "@/lib/anti-gaspi-offers";

const startCheckoutSchema = z.object({
  pickupSlot: z.string(),
  fulfillment: z.enum(["pickup", "delivery"]),
  shippingAddressId: z.string().min(1).nullable(),
  loyaltyVouchers: z.number().int().min(0),
  // Page de paiement à retrouver si le client abandonne ou si le paiement est refusé
  returnPath: z.string().regex(/^\/cart\/paiement(\?.*)?$/),
});

export type StartCheckoutInput = z.infer<typeof startCheckoutSchema>;
export type StartCheckoutResult = { mode: "simulated" } | { mode: "stripe"; url: string } | { mode: "error"; error: string };

const fail = (error: string): StartCheckoutResult => ({ mode: "error", error });

// Mode de paiement proposé : carte via Stripe si une clé est configurée, sinon paiement simulé
export async function getPaymentMode(): Promise<"stripe" | "simulated"> {
  return stripeClient() ? "stripe" : "simulated";
}

// Prépare le paiement par carte : sans clé Stripe, le tunnel garde le paiement simulé.
// Tout est recalculé ici à partir de la base, jamais à partir des montants affichés.
export async function startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
  const stripe = stripeClient();
  if (!stripe) return { mode: "simulated" };

  const parsed = startCheckoutSchema.safeParse(input);
  if (!parsed.success) return fail("Informations de commande invalides.");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Connectez-vous pour payer votre commande.");
  const { fulfillment, shippingAddressId, loyaltyVouchers, returnPath } = parsed.data;

  const slot = parseSlotParam(parsed.data.pickupSlot);
  const pickupSlot = slot ? slotToDate(slot) : null;
  if (!slot || !pickupSlot || pickupSlot.getTime() <= Date.now()) return fail("Choisissez un créneau à venir.");

  const cart = await prisma.cart.findFirst({
    where: { userId, archived: false },
    include: { productsInCart: { include: { product: { select: { name: true, price: true, picture: true } } } } },
  });
  if (!cart || cart.productsInCart.length === 0) return fail(orderFailureMessage("cart_empty"));

  if (fulfillment === "delivery") {
    const address = shippingAddressId
      ? await prisma.address.findUnique({ where: { id: shippingAddressId }, select: { userId: true } })
      : null;
    if (address?.userId !== userId) return fail(orderFailureMessage("invalid_delivery_address"));
  }

  // Vérification à blanc : on ne fait pas payer une commande qui serait refusée
  const storeId = await storeForOrder(userId);
  const unavailable = await checkAvailability(cart.id, pickupSlot, storeId);
  if (unavailable) return fail(orderFailureMessage(unavailable.code, unavailable.code === "out_of_stock" ? unavailable.products : []));

  const total = cartTotal(cart.productsInCart);
  // Articles anti-gaspi du magasin encore bons au retrait
  const antiGaspi = await cartAntiGaspi(userId, storeId, pickupSlot);
  if (loyaltyVouchers > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { loyaltyNumber: true, loyaltyPoints: true } });
    if (!user?.loyaltyNumber || loyaltyVouchers > maxVouchers(user.loyaltyPoints, total - antiGaspi.discount)) {
      return fail(orderFailureMessage("not_enough_points"));
    }
  }
  const fee = fulfillment === "delivery" ? deliveryFee(total) : 0;
  const loyaltyDiscount = loyaltyVouchers * VOUCHER_VALUE;
  // Stripe n'applique qu'une réduction par paiement : bons Carte Trinity et anti-gaspi réunis
  const discount = loyaltyDiscount + antiGaspi.discount;
  const discountName = [loyaltyDiscount > 0 && "Bons Carte Trinity", antiGaspi.discount > 0 && "Anti-gaspi"].filter(Boolean).join(" et ");
  // Photos montrées par Stripe seulement si le site est servi en HTTPS (pas en local)
  const withImages = siteUrl().startsWith("https://");

  const metadata: CheckoutMetadata = {
    userId,
    cartId: cart.id,
    pickupSlot: parsed.data.pickupSlot,
    ...(storeId && { storeId }),
    fulfillment,
    ...(fulfillment === "delivery" && shippingAddressId ? { shippingAddressId } : {}),
    loyaltyVouchers,
    antiGaspiDiscount: antiGaspi.discount,
    returnPath,
  };

  try {
    const coupon =
      discount > 0
        ? await stripe.coupons.create({ amount_off: toCents(discount), currency: "eur", duration: "once", name: discountName })
        : null;

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "fr",
      customer_email: session.user.email,
      line_items: [
        ...cart.productsInCart.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "eur",
            unit_amount: toCents(item.product.price),
            product_data: { name: item.product.name, ...(withImages && { images: [absoluteUrl(item.product.picture)] }) },
          },
        })),
        ...(fee > 0
          ? [{ quantity: 1, price_data: { currency: "eur", unit_amount: toCents(fee), product_data: { name: "Livraison à domicile" } } }]
          : []),
      ],
      ...(coupon && { discounts: [{ coupon: coupon.id }] }),
      metadata: { ...metadata, loyaltyVouchers: String(metadata.loyaltyVouchers), antiGaspiDiscount: String(antiGaspi.discount) },
      success_url: `${siteUrl()}/api/payments/stripe/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}${returnPath}`,
    });
    return checkout.url ? { mode: "stripe", url: checkout.url } : fail("Le paiement est momentanément indisponible.");
  } catch (error) {
    console.error("Session de paiement Stripe non créée :", error);
    return fail("Le paiement est momentanément indisponible. Réessayez dans un instant.");
  }
}
