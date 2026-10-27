import type { Order } from "@prisma/client";
import prisma from "@/lib/prisma";
import { SLOT_CAPACITY } from "@/lib/checkout";
import { storeStockMap } from "@/lib/stock";
import { orderNumber } from "@/lib/account";
import { POINTS_PER_VOUCHER, VOUCHER_VALUE, maxVouchers, pointsForAmount } from "@/lib/loyalty";
import { allocateAntiGaspi } from "@/lib/anti-gaspi";
import { takeFromLots } from "@/lib/stock-lots";

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
  // Remise anti-gaspi déjà déduite du paiement Stripe : elle reste acquise au client même si un autre
  // a pris les dernières unités du lot entre-temps
  paidAntiGaspiDiscount?: number;
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

const CART_ITEMS = {
  productsInCart: {
    include: {
      product: { select: { price: true, name: true } },
      antiGaspiLot: { select: { id: true, storeId: true, quantity: true, bestBefore: true, closedAt: true, markdownDays: true } },
    },
  },
} as const;

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

      // Articles anti-gaspi : unités réservées dans leur lot à date courte ; si un autre client a pris
      // les dernières, la ligne repasse au prix normal
      const antiGaspi = allocateAntiGaspi(
        cart.productsInCart.map((item) => ({ productId: item.productId, quantity: item.quantity, price: item.product.price, lot: item.antiGaspiLot })),
        storeId,
        pickupSlot
      );
      const served: typeof antiGaspi.allocations = [];
      for (const allocation of antiGaspi.allocations) {
        const line = cart.productsInCart.find((item) => item.productId === allocation.productId);
        if (!line) continue;
        const { count } = await prisma.stockLot.updateMany({
          where: { id: allocation.lotId, closedAt: null, quantity: { gte: allocation.units } },
          data: { quantity: { decrement: allocation.units }, soldQuantity: { increment: allocation.units } },
        });
        if (count === 0) continue;
        served.push(allocation);
        await prisma.stockLot.updateMany({ where: { id: allocation.lotId, quantity: 0, closedAt: null }, data: { closedAt: new Date() } });
        await prisma.lotAllocation.create({ data: { lineId: line.id, lotId: allocation.lotId, quantity: allocation.units } });
        await prisma.productInCart.update({
          where: { id: line.id },
          data: { antiGaspiQuantity: allocation.units, antiGaspiDiscount: allocation.discount },
        });
      }
      const antiGaspiDiscount = input.paidAntiGaspiDiscount ?? served.reduce((sum, allocation) => sum + allocation.discount, 0);
      const itemsDue = total - antiGaspiDiscount;

      if (requestedVouchers > 0 && (!hasCard || requestedVouchers > maxVouchers(user.loyaltyPoints, itemsDue))) {
        throw new PlaceOrderFailure({ code: "not_enough_points" });
      }
      const loyaltyDiscount = requestedVouchers * VOUCHER_VALUE;
      const loyaltyPointsUsed = requestedVouchers * POINTS_PER_VOUCHER;
      const loyaltyPointsEarned = hasCard ? pointsForAmount(itemsDue - loyaltyDiscount) : 0;

      if (await slotIsFull(prisma, storeId, pickupSlot)) throw new PlaceOrderFailure({ code: "slot_full" });

      // Stock du drive décompté article par article : la mise à jour n'aboutit que si la quantité suffit,
      // et une seule rupture annule toute la transaction
      const missing: string[] = [];
      for (const item of cart.productsInCart) {
        const { count } = await prisma.storeStock.updateMany({
          where: { storeId, productId: item.productId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (count === 0) missing.push(item.product.name);
      }
      if (missing.length > 0) throw new PlaceOrderFailure({ code: "out_of_stock", products: missing });

      // Les autres unités viennent des lots aux dates les plus longues, rattachés à chaque ligne
      for (const item of cart.productsInCart) {
        const fromOffer = served.find((allocation) => allocation.productId === item.productId)?.units ?? 0;
        await takeFromLots(prisma, {
          storeId,
          productId: item.productId,
          quantity: item.quantity - fromOffer,
          outcome: "sold",
          order: "freshest",
          lineId: item.id,
        });
      }

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
          antiGaspiDiscount,
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
    select: { quantity: true, product: { select: { id: true, name: true } } },
  });
  const stock = await storeStockMap(storeId, items.map((item) => item.product.id));
  const missing = items.filter((item) => (stock.get(item.product.id) ?? 0) < item.quantity).map((item) => item.product.name);
  return missing.length ? { code: "out_of_stock", products: missing } : null;
}
