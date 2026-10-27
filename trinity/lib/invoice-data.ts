import prisma from "@/lib/prisma";
import type { InvoiceData } from "@/lib/invoice-pdf";
import { orderNumber } from "@/lib/account";
import { formatPickupDate } from "@/lib/checkout";
import { orderDeliveryFee } from "@/lib/delivery";
import { storeAddressLines } from "@/lib/stores";
import { preparationSummary } from "@/lib/orders/preparation";
import { linePrice } from "@/lib/orders/line-price";

// Données d'une commande pour sa facture et son e-mail de confirmation.
// Sans contrôle d'accès : à appeler après avoir vérifié que l'utilisateur peut voir la commande.
export async function loadInvoice(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      billingAddress: true,
      shippingAddress: true,
      store: { select: { name: true, street: true, zipCode: true, city: true, phone: true } },
      cart: {
        include: {
          productsInCart: {
            include: { product: { include: { brand: true } }, substitute: { select: { name: true, price: true } } },
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
  const itemsTotal = order.cart.productsInCart.reduce((acc, item) => acc + linePrice(item) * item.quantity, 0);
  const deliveryFee = orderDeliveryFee(order, itemsTotal);
  // Une fois la préparation validée : articles manquants ou remplacés, et montant réellement remboursé
  const preparation = order.preparedAt
    ? { refund: order.preparationRefund, changes: preparationSummary(order.cart.productsInCart).changes }
    : null;

  const data: InvoiceData = {
    invoiceNumber: `FAC-${number}`,
    orderNumber: number,
    createdAt: order.createdAt,
    pickupLabel: order.pickupSlot ? formatPickupDate(order.pickupSlot) : null,
    store: order.store ? { name: order.store.name, address: storeAddressLines(order.store), phone: order.store.phone } : null,
    delivery: shipping ? { address: [shipping.street, `${shipping.zipCode} ${shipping.city}`], fee: deliveryFee } : null,
    loyalty: {
      discount: order.loyaltyDiscount,
      pointsUsed: order.loyaltyPointsUsed,
      pointsEarned: order.loyaltyPointsEarned,
      cardNumber: order.user.loyaltyNumber,
    },
    antiGaspiDiscount: order.antiGaspiDiscount,
    preparation,
    customer: {
      name: `${order.user.firstName} ${order.user.lastName}`,
      email: order.user.email,
      address: address ? [address.street, `${address.zipCode} ${address.city}`, address.country] : [],
    },
    items: order.cart.productsInCart.map((line) => {
      const { product, quantity } = line;
      const price = linePrice(line);
      return {
        name: product.name,
        brand: product.brand?.name ?? null,
        netContent: product.netContent,
        quantity,
        price,
        // Payé moins que le prix actuel (prospectus, promotion terminée depuis) : le prix actuel est barré
        regularPrice: price < product.price ? (product.regularPrice ?? product.price) : product.regularPrice,
      };
    }),
  };

  return {
    data,
    userId: order.userId,
    firstName: order.user.firstName,
    email: order.user.email,
    total: Math.max(0, itemsTotal - order.loyaltyDiscount - order.antiGaspiDiscount - order.preparationRefund) + deliveryFee,
  };
}
