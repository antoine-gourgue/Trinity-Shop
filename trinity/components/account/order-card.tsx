import Link from "next/link";
import { CalendarClock, ChevronRight, Truck } from "lucide-react";
import ProductImage from "@/components/product/product-image";
import type { OrderStatus as OrderStatusValue } from "@prisma/client";
import OrderStatus from "@/components/account/order-status";
import { formatPrice } from "@/lib/format";
import { orderNumber } from "@/lib/account";
import { formatPickupDate } from "@/lib/checkout";
import { orderDeliveryFee } from "@/lib/delivery";

interface OrderCardProps {
  href: string;
  order: {
    id: string;
    createdAt: Date;
    status: OrderStatusValue;
    pickupSlot?: Date | null;
    loyaltyDiscount?: number;
    preparationRefund?: number;
    shippingAddressId?: string | null;
    cart: { productsInCart: { quantity: number; product: { id: string; name: string; price: number; picture: string } }[] };
  };
}

const MAX_THUMBNAILS = 5;

export default function OrderCard({ href, order }: OrderCardProps) {
  const items = order.cart.productsInCart;
  const itemsTotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const delivery = !!order.shippingAddressId;
  const total =
    Math.max(0, itemsTotal - (order.loyaltyDiscount ?? 0) - (order.preparationRefund ?? 0)) +
    orderDeliveryFee({ shippingAddressId: order.shippingAddressId ?? null }, itemsTotal);
  const articleCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Link
      href={href}
      className="group block rounded-3xl border bg-white p-5 transition-shadow hover:shadow-lg md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Commande n° {orderNumber(order.id)}
          </p>
          <p className="mt-0.5 font-extrabold first-letter:uppercase">
            {new Date(order.createdAt).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {order.pickupSlot && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              {delivery ? (
                <Truck size={15} className="text-primary" aria-hidden />
              ) : (
                <CalendarClock size={15} className="text-primary" aria-hidden />
              )}
              {delivery ? "Livraison" : "Retrait"} {formatPickupDate(new Date(order.pickupSlot)).toLowerCase()}
            </p>
          )}
        </div>
        <OrderStatus status={order.status} delivery={delivery} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <ul className="flex items-center -space-x-2">
          {items.slice(0, MAX_THUMBNAILS).map((item) => (
            <li
              key={item.product.id}
              className="relative h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-white shadow-sm"
            >
              <ProductImage src={item.product.picture} alt={item.product.name} sizes="56px" className="p-1" />
            </li>
          ))}
          {items.length > MAX_THUMBNAILS && (
            <li className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-white bg-secondary text-sm font-black text-brand-dark">
              +{items.length - MAX_THUMBNAILS}
            </li>
          )}
        </ul>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {articleCount} article{articleCount > 1 ? "s" : ""}
            </p>
            <p className="text-lg font-black">{formatPrice(total)}</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <ChevronRight size={20} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
