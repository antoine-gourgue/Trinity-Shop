import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CreditCard, Mail, MapPin, Phone, Store, Truck, User } from "lucide-react";
import { getAdminOrder, orderTotal } from "@/lib/admin/queries";
import { orderNumber } from "@/lib/account";
import { formatBrand, formatPrice } from "@/lib/format";
import { orderDeliveryFee } from "@/lib/delivery";
import { AdminPageHeader, Panel, formatDate } from "@/components/admin/admin-ui";
import { PickupBadge, ProductThumb, customerName, pickupLabel } from "@/components/admin/admin-bits";
import { CancelOrderButton, InvoiceButton } from "@/components/admin/order-actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Commande #${orderNumber((await params).id)}` };
}

export default async function AdminOrderPage({ params }: Props) {
  const order = await getAdminOrder((await params).id);
  if (!order) notFound();

  const number = orderNumber(order.id);
  const items = order.cart.productsInCart;
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const articles = items.reduce((acc, item) => acc + item.quantity, 0);
  const shipping = order.shippingAddress;
  const fee = orderDeliveryFee(order, subtotal);

  return (
    <div>
      <AdminPageHeader
        back={{ href: "/admin/orders", label: "Commandes" }}
        title={`Commande #${number}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Passée le {formatDate(order.createdAt, true)}
            <PickupBadge pickupSlot={order.pickupSlot} validated={order.validated} delivery={!!shipping} />
          </span>
        }
        actions={
          <>
            <InvoiceButton orderId={order.id} label />
            <CancelOrderButton orderId={order.id} number={number} label redirectTo="/admin/orders" />
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Panel title="Articles" description={`${articles} article${articles > 1 ? "s" : ""}`} className="xl:col-span-2" padded={false}>
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                <ProductThumb src={item.product.picture} alt="" />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/products/${item.product.id}`} className="line-clamp-2 font-semibold hover:text-primary hover:underline">
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatBrand(item.product.brand.name)}
                    {item.product.netContent && ` · ${item.product.netContent}`} · {item.product.barCode.toString()}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm">
                  <span className="block text-muted-foreground tabular-nums">
                    {item.quantity} × {formatPrice(item.product.price)}
                  </span>
                  <span className="block font-black tabular-nums">{formatPrice(item.product.price * item.quantity)}</span>
                </p>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t bg-muted/30 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sous-total</dt>
              <dd className="font-bold tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            {order.loyaltyDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Bons Carte Trinity</dt>
                <dd className="font-bold tabular-nums text-promo">− {formatPrice(order.loyaltyDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Préparation</dt>
              <dd className="font-bold text-bio">Offerte</dd>
            </div>
            {shipping && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Livraison à domicile</dt>
                <dd className={fee > 0 ? "font-bold tabular-nums" : "font-bold text-bio"}>{fee > 0 ? formatPrice(fee) : "Offerte"}</dd>
              </div>
            )}
            <div className="flex items-end justify-between border-t pt-3">
              <dt className="font-extrabold">Total TTC</dt>
              <dd className="text-xl font-black tabular-nums">{formatPrice(orderTotal(order))}</dd>
            </div>
          </dl>
        </Panel>

        <div className="space-y-6">
          <Panel title="Client">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <User size={16} className="shrink-0 text-primary" aria-hidden />
                <Link href={`/admin/users?q=${encodeURIComponent(order.user.email)}`} className="font-bold hover:text-primary hover:underline">
                  {customerName(order.user)}
                </Link>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="shrink-0 text-primary" aria-hidden />
                <a href={`mailto:${order.user.email}`} className="truncate hover:text-primary hover:underline">
                  {order.user.email}
                </a>
              </li>
              {order.user.phone && (
                <li className="flex items-center gap-3">
                  <Phone size={16} className="shrink-0 text-primary" aria-hidden />
                  {order.user.phone}
                </li>
              )}
              <li className="flex items-center gap-3">
                <CreditCard size={16} className="shrink-0 text-primary" aria-hidden />
                {order.user.loyaltyNumber ? (
                  <span>
                    Carte Trinity · {order.loyaltyPointsEarned > 0 ? `+${order.loyaltyPointsEarned} pts` : "aucun point gagné"}
                    {order.loyaltyPointsUsed > 0 && `, ${order.loyaltyPointsUsed} pts utilisés`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pas de Carte Trinity</span>
                )}
              </li>
            </ul>
          </Panel>

          <Panel title={shipping ? "Livraison à domicile" : "Retrait au drive"}>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <CalendarClock size={16} className="shrink-0 text-primary" aria-hidden />
                {order.pickupSlot ? pickupLabel(order.pickupSlot) : <span className="text-muted-foreground">Aucun créneau choisi</span>}
              </li>
              {shipping ? (
                <li className="flex gap-3">
                  <Truck size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                  <span>
                    {shipping.street}
                    <br />
                    {shipping.zipCode} {shipping.city}, {shipping.country}
                  </span>
                </li>
              ) : (
                <li className="flex items-center gap-3">
                  <Store size={16} className="shrink-0 text-primary" aria-hidden />
                  Drive Trinity U Rennes Epitech
                </li>
              )}
            </ul>
          </Panel>

          <Panel title="Facturation">
            {order.billingAddress ? (
              <p className="flex gap-3 text-sm">
                <MapPin size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                <span>
                  {order.billingAddress.street}
                  <br />
                  {order.billingAddress.zipCode} {order.billingAddress.city}
                  <br />
                  {order.billingAddress.country}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune adresse de facturation.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
