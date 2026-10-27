import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardCheck, CreditCard, Mail, MapPin, Phone, Store, Truck, User } from "lucide-react";
import { getAdminOrder, orderTotal } from "@/lib/admin/queries";
import { orderNumber } from "@/lib/account";
import { formatBrand, formatPrice } from "@/lib/format";
import { orderDeliveryFee } from "@/lib/delivery";
import { AdminPageHeader, Badge, Panel, formatDate } from "@/components/admin/admin-ui";
import { OrderStatusBadge, ProductThumb, customerName, pickupLabel } from "@/components/admin/admin-bits";
import { AdvanceOrderButton, CancelOrderButton, DeleteOrderButton, InvoiceButton } from "@/components/admin/order-actions";
import { backOfficePage } from "@/lib/admin/access";
import { canCancelOrder, nextOrderStatus, orderStatusLabel } from "@/lib/order-status";
import { lineOutcome } from "@/lib/orders/preparation";
import { lotLines } from "@/lib/lot-labels";
import { linePrice } from "@/lib/orders/line-price";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Commande #${orderNumber((await params).id)}` };
}

export default async function AdminOrderPage({ params }: Props) {
  const { store } = await backOfficePage();
  const order = await getAdminOrder((await params).id);
  // Une commande d'un autre magasin n'existe pas pour un compte magasin
  if (!order || (store && order.storeId !== store.id)) notFound();

  const number = orderNumber(order.id);
  const items = order.cart.productsInCart;
  const subtotal = items.reduce((acc, item) => acc + linePrice(item) * item.quantity, 0);
  const articles = items.reduce((acc, item) => acc + item.quantity, 0);
  const shipping = order.shippingAddress;
  const fee = orderDeliveryFee(order, subtotal);
  const next = nextOrderStatus(order.status);
  const preparable = order.status === "received" || order.status === "preparing";

  return (
    <div>
      <AdminPageHeader
        back={{ href: "/admin/orders", label: "Commandes" }}
        title={`Commande #${number}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Passée le {formatDate(order.createdAt, true)}
            <OrderStatusBadge status={order.status} delivery={!!shipping} />
          </span>
        }
        actions={
          <>
            {preparable && (
              <Link
                href={`/admin/preparation/${order.id}`}
                className="flex h-11 items-center gap-2 rounded-full bg-brand-dark px-5 text-sm font-bold text-white transition-colors hover:bg-primary"
              >
                <ClipboardCheck size={16} aria-hidden /> Préparer la commande
              </Link>
            )}
            {next && <AdvanceOrderButton orderId={order.id} nextLabel={orderStatusLabel(next, !!shipping)} />}
            <InvoiceButton orderId={order.id} label />
            {canCancelOrder(order.status) && <CancelOrderButton orderId={order.id} number={number} label />}
            {/* Suppression réservée au siège */}
            {order.status === "cancelled" && !store && (
              <DeleteOrderButton orderId={order.id} number={number} label redirectTo="/admin/orders" />
            )}
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
                  <Link
                    href={store ? `/admin/stocks?q=${item.product.barCode.toString()}` : `/admin/products/${item.product.id}`}
                    className="line-clamp-2 font-semibold hover:text-primary hover:underline"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatBrand(item.product.brand.name)}
                    {item.product.netContent && ` · ${item.product.netContent}`} · {item.product.barCode.toString()}
                  </p>
                  {item.lotAllocations.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Lots : {lotLines(item.lotAllocations).map((lot) => `${lot.quantity} × ${lot.bestBefore}`).join(", ")}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    {item.allowSubstitute ? (
                      <Badge tone="success">Remplacement accepté</Badge>
                    ) : (
                      <Badge tone="warning">Pas de remplacement</Badge>
                    )}
                    {item.antiGaspiQuantity > 0 && (
                      <Badge tone="success">
                        Anti-gaspi ×{item.antiGaspiQuantity} · − {formatPrice(item.antiGaspiDiscount)}
                      </Badge>
                    )}
                    <PreparationBadge line={item} />
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm">
                  <span className="block text-muted-foreground tabular-nums">
                    {item.quantity} × {formatPrice(linePrice(item))}
                  </span>
                  <span className="block font-black tabular-nums">{formatPrice(linePrice(item) * item.quantity)}</span>
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
            {order.antiGaspiDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Remise anti-gaspi</dt>
                <dd className="font-bold tabular-nums text-promo">− {formatPrice(order.antiGaspiDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Préparation</dt>
              <dd className="font-bold text-bio">Offerte</dd>
            </div>
            {order.preparationRefund > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Remboursé à la préparation</dt>
                <dd className="font-bold tabular-nums text-promo">− {formatPrice(order.preparationRefund)}</dd>
              </div>
            )}
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
              {shipping && (
                <li className="flex gap-3">
                  <Truck size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                  <span>
                    {shipping.street}
                    <br />
                    {shipping.zipCode} {shipping.city}, {shipping.country}
                  </span>
                </li>
              )}
              {/* Magasin qui prépare : drive de retrait, ou départ de la livraison */}
              <li className="flex gap-3">
                <Store size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                {order.store ? (
                  <span>
                    {shipping ? "Préparée par " : "Drive "}
                    <span className="font-semibold">{order.store.name}</span>
                    <br />
                    {order.store.street}, {order.store.zipCode} {order.store.city}
                  </span>
                ) : (
                  <span>Magasin non renseigné</span>
                )}
              </li>
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

// Résultat de la préparation d'un article : rien tant qu'il n'est pas traité ou s'il est complet
function PreparationBadge({ line }: { line: Parameters<typeof lineOutcome>[0] }) {
  if (line.preparedQuantity === null) return null;
  const { missing, substitute } = lineOutcome(line);
  if (missing === 0) return <Badge tone="success">Prélevé</Badge>;
  return substitute ? (
    <Badge tone="brand">
      {missing} remplacé{missing > 1 ? "s" : ""} par <span className="max-w-56 truncate">{substitute.name}</span>
    </Badge>
  ) : (
    <Badge tone="danger">
      {missing} manquant{missing > 1 ? "s" : ""} · remboursé{missing > 1 ? "s" : ""}
    </Badge>
  );
}
