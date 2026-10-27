import type { Order } from "@prisma/client";
import prisma from "@/lib/prisma";
import { SLOT_CAPACITY } from "@/lib/checkout";
import { orderNumber } from "@/lib/account";
import { POINTS_PER_VOUCHER, VOUCHER_VALUE, maxVouchers, pointsForAmount } from "@/lib/loyalty";

// Passage d'une commande, partagé par l'API (paiement simulé) et la confirmation d'un paiement Stripe

export interface PlaceOrderInput {
  userId: string;
  cartId: string;
  billingAddressId?: string;
  pickupSlot: Date | null;
  // Magasin qui prépare la commande (celui du client) ; obligatoire
  storeId: string | null;
  // Adresse demandée pour une livraison à domicile ; absente pour un retrait au drive
  delivery: { shippingAddressId?: string } | null;
  loyaltyVouchers: number;
  stripeSessionId?: string;
}

export type PlaceOrderError =
  | { code: "store_required" }
  | { code: "invalid_delivery_address" }
  | { code: "cart_not_found" }
  | { code: "cart_forbidden" }
  | { code: "cart_empty" }
  | { code: "not_enough_points" }
  | { code: "slot_full" }
  | { code: "out_of_stock"; products: string[] };

export type PlaceOrderResult = { ok: true; order: Order } | { ok: false; error: PlaceOrderError };

class PlaceOrderFailure extends Error {
  constructor(readonly failure: PlaceOrderError) {
    super(failure.code);
  }
}

const CART_ITEMS = { productsInCart: { include: { product: { select: { price: true, name: true } } } } } as const;

// Adresse de livraison, si elle appartient bien au client
async function deliveryAddress(userId: string, requested?: string) {
  if (!requested) return null;
  const address = await prisma.address.findUnique({ where: { id: requested }, select: { userId: true } });
  return address?.userId === userId ? requested : null;
}

// Adresse de facturation résolue côté serveur : la session peut être antérieure à la création
// d'une adresse, et un nouveau compte n'en a pas
async function billingAddress(userId: string, requested?: string) {
  if (requested) return requested;
  const existing = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (existing) return existing.id;
  const created = await prisma.address.create({
    data: {
      userId,
      type: "domicile",
      street: "1 rue de la Démonstration",
      city: "Anglet",
      zipCode: "64600",
      country: "France",
    },
  });
  return created.id;
}

export function cartTotal(items: { quantity: number; product: { price: number } }[]) {
  return items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
}

// Créneau complet : le nombre de commandes par heure est limité dans chaque drive
async function slotIsFull(client: Pick<typeof prisma, "order">, storeId: string, pickupSlot: Date | null) {
  if (!pickupSlot) return false;
  const booked = await client.order.count({ where: { storeId, pickupSlot, status: { not: "cancelled" } } });
  return booked >= SLOT_CAPACITY;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const { userId, cartId, pickupSlot, storeId, stripeSessionId } = input;
  if (!storeId) return { ok: false, error: { code: "store_required" } };

  let shippingAddressId: string | null = null;
  if (input.delivery) {
    shippingAddressId = await deliveryAddress(userId, input.delivery.shippingAddressId);
    if (!shippingAddressId) return { ok: false, error: { code: "invalid_delivery_address" } };
  }

  const billingAddressId = await billingAddress(userId, input.billingAddressId);

  const cart = await prisma.cart.findUnique({ where: { id: cartId }, include: CART_ITEMS });
  if (!cart) return { ok: false, error: { code: "cart_not_found" } };
  if (cart.userId !== userId) return { ok: false, error: { code: "cart_forbidden" } };
  if (cart.productsInCart.length === 0) return { ok: false, error: { code: "cart_empty" } };

  const total = cartTotal(cart.productsInCart);
  const requestedVouchers = Math.max(0, input.loyaltyVouchers);

  try {
    const order = await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { loyaltyNumber: true, loyaltyPoints: true },
      });
      const hasCard = !!user?.loyaltyNumber;

      if (requestedVouchers > 0 && (!hasCard || requestedVouchers > maxVouchers(user.loyaltyPoints, total))) {
        throw new PlaceOrderFailure({ code: "not_enough_points" });
      }
      const loyaltyDiscount = requestedVouchers * VOUCHER_VALUE;
      const loyaltyPointsUsed = requestedVouchers * POINTS_PER_VOUCHER;
      const loyaltyPointsEarned = hasCard ? pointsForAmount(total - loyaltyDiscount) : 0;

      if (await slotIsFull(prisma, storeId, pickupSlot)) throw new PlaceOrderFailure({ code: "slot_full" });

      // Stock décompté article par article : la mise à jour n'aboutit que si la quantité suffit,
      // et une seule rupture annule toute la transaction
      const missing: string[] = [];
      for (const item of cart.productsInCart) {
        const { count } = await prisma.stock.updateMany({
          where: { productId: item.productId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (count === 0) missing.push(item.product.name);
      }
      if (missing.length > 0) throw new PlaceOrderFailure({ code: "out_of_stock", products: missing });

      const newOrder = await prisma.order.create({
        data: {
          userId,
          cartId,
          billingAddressId,
          shippingAddressId,
          pickupSlot,
          storeId,
          loyaltyDiscount,
          loyaltyPointsUsed,
          loyaltyPointsEarned,
          validated: true,
          stockDeducted: true,
          ...(stripeSessionId && { stripeSessionId }),
        },
      });

      await prisma.cart.update({ where: { id: cartId }, data: { archived: true } });

      // Solde et historique de la Carte Trinity
      if (hasCard && (loyaltyPointsUsed > 0 || loyaltyPointsEarned > 0)) {
        const number = orderNumber(newOrder.id);
        await prisma.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: loyaltyPointsEarned - loyaltyPointsUsed } },
        });
        await prisma.loyaltyTransaction.createMany({
          data: [
            ...(loyaltyPointsUsed > 0
              ? [{ userId, orderId: newOrder.id, points: -loyaltyPointsUsed, label: `Bon de réduction, commande n° ${number}` }]
              : []),
            ...(loyaltyPointsEarned > 0
              ? [{ userId, orderId: newOrder.id, points: loyaltyPointsEarned, label: `Points gagnés, commande n° ${number}` }]
              : []),
          ],
        });
      }

      return newOrder;
    });
    return { ok: true, order };
  } catch (error) {
    if (error instanceof PlaceOrderFailure) return { ok: false, error: error.failure };
    throw error;
  }
}

// Vérification à blanc avant un paiement : magasin, stock et créneau, sans rien réserver
export async function checkAvailability(cartId: string, pickupSlot: Date | null, storeId: string | null): Promise<PlaceOrderError | null> {
  if (!storeId) return { code: "store_required" };
  if (await slotIsFull(prisma, storeId, pickupSlot)) return { code: "slot_full" };
  const items = await prisma.productInCart.findMany({
    where: { cartId },
    select: { quantity: true, product: { select: { name: true, stock: { select: { quantity: true } } } } },
  });
  const missing = items.filter((item) => (item.product.stock?.quantity ?? 0) < item.quantity).map((item) => item.product.name);
  return missing.length ? { code: "out_of_stock", products: missing } : null;
}
