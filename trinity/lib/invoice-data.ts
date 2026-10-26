import prisma from "@/lib/prisma";
import type { InvoiceData } from "@/lib/invoice-pdf";
import { orderNumber } from "@/lib/account";
import { formatPickupDate } from "@/lib/checkout";
import { orderDeliveryFee } from "@/lib/delivery";

// Données d'une commande pour sa facture et son e-mail de confirmation.
// Sans contrôle d'accès : à appeler après avoir vérifié que l'utilisateur peut voir la commande.
export async function loadInvoice(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      billingAddress: true,
      shippingAddress: true,
      cart: {
        include: {
          productsInCart: {
            include: { product: { include: { brand: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!order) return null;

  const address = order.billingAddress;
  const shipping = order.shippingAddress;
  const number = orderNumber(order.id);
  const itemsTotal = order.cart.productsInCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryFee = orderDeliveryFee(order, itemsTotal);

  const data: InvoiceData = {
    invoiceNumber: `FAC-${number}`,
    orderNumber: number,
    createdAt: order.createdAt,
    pickupLabel: order.pickupSlot ? formatPickupDate(order.pickupSlot) : null,
    delivery: shipping ? { address: [shipping.street, `${shipping.zipCode} ${shipping.city}`], fee: deliveryFee } : null,
    loyalty: {
      discount: order.loyaltyDiscount,
      pointsUsed: order.loyaltyPointsUsed,
      pointsEarned: order.loyaltyPointsEarned,
      cardNumber: order.user.loyaltyNumber,
    },
    customer: {
      name: `${order.user.firstName} ${order.user.lastName}`,
      email: order.user.email,
      address: address ? [address.street, `${address.zipCode} ${address.city}`, address.country] : [],
    },
    items: order.cart.productsInCart.map(({ product, quantity }) => ({
      name: product.name,
      brand: product.brand?.name ?? null,
      netContent: product.netContent,
      quantity,
      price: product.price,
      regularPrice: product.regularPrice,
    })),
  };

  return {
    data,
    userId: order.userId,
    firstName: order.user.firstName,
    email: order.user.email,
    total: Math.max(0, itemsTotal - order.loyaltyDiscount) + deliveryFee,
  };
}
