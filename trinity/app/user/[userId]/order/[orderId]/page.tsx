import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, MapPin, Store, Truck } from "lucide-react";
import { getOrderById } from "@/lib/server-actions/orders-actions";
import InvoiceDownloadButton from "@/components/invoice/InvoiceDownloadButton";
import ReorderButton from "@/components/account/reorder-button";
import ProductImage from "@/components/product/product-image";
import OrderStatus from "@/components/account/order-status";
import OrderProgress from "@/components/account/order-progress";
import { AccountCard } from "@/components/account/account-ui";
import Price from "@/components/product/price";
import { formatBrand, formatPrice } from "@/lib/format";
import { orderNumber, requireUser } from "@/lib/account";
import { formatPickupDate } from "@/lib/checkout";
import { orderDeliveryFee } from "@/lib/delivery";
import CheckoutSteps from "@/components/cart/checkout-steps";
import { lineOutcome } from "@/lib/orders/preparation";
import { canCheckIn } from "@/lib/drive";
import DriveCheckIn from "@/components/account/drive-check-in";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
    params: Promise<{ userId: string; orderId: string }>;
    searchParams: Promise<{ confirmation?: string }>;
}

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
    const sessionUser = await requireUser();
    const { orderId } = await params;
    const justOrdered = (await searchParams).confirmation === "1";

    const order = await getOrderById(orderId);
    // Une commande d'un autre compte est traitée comme introuvable
    if (!order || order.userId !== sessionUser.id) return notFound();

    const items = order.cart.productsInCart;
    const totalAmount = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const articleCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const billing = order.billingAddress;
    const pickupLabel = order.pickupSlot ? formatPickupDate(order.pickupSlot) : null;
    const shipping = order.shippingAddress;
    const fee = orderDeliveryFee(order, totalAmount);

    return (
        <div className="space-y-6">
            <Link
                href={`/user/${sessionUser.id}/order`}
                className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
                <ArrowLeft size={16} aria-hidden /> Mes commandes
            </Link>

            {justOrdered && <CheckoutSteps current={3} />}

            {justOrdered && (
                <div className="flex items-start gap-4 rounded-3xl bg-bio p-5 text-white md:p-6">
                    <CircleCheck size={32} className="shrink-0" aria-hidden />
                    <div>
                        <p className="text-lg font-black">Merci, votre commande est validée !</p>
                        <p className="text-sm text-white/85">
                            {pickupLabel
                                ? `Nos équipes préparent vos courses pour ${shipping ? "la livraison" : "le retrait"} du ${pickupLabel.toLowerCase()}.`
                                : "Nos équipes préparent vos courses."}{" "}
                            Retrouvez ci-dessous le détail et votre facture.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                        Commande n° {orderNumber(order.id)}
                    </p>
                    <h1 className="mt-1 text-2xl font-black first-letter:uppercase md:text-3xl">
                        {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </h1>
                </div>
                <OrderStatus status={order.status} delivery={!!order.shippingAddressId} className="text-sm" />
            </div>

            <div className="rounded-2xl border bg-white p-5">
                <OrderProgress status={order.status} delivery={!!order.shippingAddressId} />
            </div>

            {/* Courses prêtes au drive : le client signale son arrivée et sa place */}
            {canCheckIn(order) && (
                <DriveCheckIn
                    orderId={order.id}
                    storeName={order.store?.name ?? "Trinity"}
                    arrivedAt={order.arrivedAt?.toISOString() ?? null}
                    parkingSpot={order.parkingSpot}
                />
            )}

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <AccountCard title={`${articleCount} article${articleCount > 1 ? "s" : ""}`}>
                    <ul className="divide-y">
                        {items.map((item) => (
                            <li key={item.product.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                                <Link
                                    href={`/product/${item.product.id}`}
                                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white sm:h-20 sm:w-20"
                                >
                                    <ProductImage src={item.product.picture} alt={item.product.name} sizes="80px" className="p-1.5" />
                                </Link>
                                <div className="min-w-0 flex-1">
                                    {item.product.brand && (
                                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">
                                            {formatBrand(item.product.brand.name)}
                                        </p>
                                    )}
                                    <Link
                                        href={`/product/${item.product.id}`}
                                        className="line-clamp-2 font-bold leading-snug hover:underline"
                                    >
                                        {item.product.name}
                                    </Link>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        {item.quantity} × {formatPrice(item.product.price)}
                                    </p>
                                    {item.antiGaspiQuantity > 0 && (
                                        <p className="mt-1.5 inline-flex rounded-full bg-bio/10 px-2.5 py-0.5 text-xs font-bold text-bio">
                                            Anti-gaspi : {item.antiGaspiQuantity} à date courte · − {formatPrice(item.antiGaspiDiscount)}
                                        </p>
                                    )}
                                    <PreparationNote line={item} />
                                </div>
                                <span className="shrink-0 font-black tabular-nums">
                                    {formatPrice(item.product.price * item.quantity)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </AccountCard>

                <div className="space-y-6 xl:sticky xl:top-[140px]">
                    <AccountCard title="Récapitulatif">
                        <dl className="space-y-2.5 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Sous-total</dt>
                                <dd className="font-bold">{formatPrice(totalAmount)}</dd>
                            </div>
                            {order.loyaltyDiscount > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Bons Carte Trinity ({order.loyaltyPointsUsed} pts)
                                    </dt>
                                    <dd className="font-bold text-promo">− {formatPrice(order.loyaltyDiscount)}</dd>
                                </div>
                            )}
                            {order.antiGaspiDiscount > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Remise anti-gaspi</dt>
                                    <dd className="font-bold text-promo">− {formatPrice(order.antiGaspiDiscount)}</dd>
                                </div>
                            )}
                            {order.preparationRefund > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Remboursé à la préparation</dt>
                                    <dd className="font-bold text-promo">− {formatPrice(order.preparationRefund)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Préparation de la commande</dt>
                                <dd className="font-bold text-bio">Offerte</dd>
                            </div>
                            {shipping && (
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Livraison à domicile</dt>
                                    <dd className={fee > 0 ? "font-bold" : "font-bold text-bio"}>{fee > 0 ? formatPrice(fee) : "Offerte"}</dd>
                                </div>
                            )}
                        </dl>
                        <div className="mt-4 flex items-end justify-between border-t pt-4">
                            <span className="font-extrabold">Total</span>
                            <Price value={Math.max(0, totalAmount - order.loyaltyDiscount - order.antiGaspiDiscount - order.preparationRefund) + fee} size="lg" />
                        </div>
                        {order.loyaltyPointsEarned > 0 && (
                            <p className="mt-3 rounded-xl bg-highlight/25 px-3 py-2 text-center text-sm font-bold text-brand-dark">
                                + {order.loyaltyPointsEarned} points cumulés sur votre Carte Trinity
                            </p>
                        )}
                        <div className="mt-5 space-y-3">
                            <ReorderButton orderId={order.id} />
                            <InvoiceDownloadButton orderId={order.id} />
                        </div>
                    </AccountCard>

                    <AccountCard
                        title={shipping ? "Livraison à domicile" : "Retrait"}
                        icon={shipping ? <Truck size={18} aria-hidden /> : <Store size={18} aria-hidden />}
                    >
                        <p className="text-sm">
                            <span className="font-bold">
                                {shipping
                                    ? `${shipping.street}, ${shipping.zipCode} ${shipping.city}`
                                    : `Drive ${order.store?.name ?? "Trinity"}`}
                            </span>
                            {!shipping && order.store && (
                                <>
                                    <br />
                                    <span className="text-muted-foreground">
                                        {order.store.street}, {order.store.zipCode} {order.store.city}
                                    </span>
                                </>
                            )}
                            {pickupLabel && (
                                <>
                                    <br />
                                    <span className="text-muted-foreground">{pickupLabel}</span>
                                </>
                            )}
                        </p>
                        {billing && (
                            <div className="mt-4 border-t pt-4 text-sm">
                                <p className="mb-1 flex items-center gap-1.5 font-bold">
                                    <MapPin size={15} className="text-primary" aria-hidden /> Adresse de facturation
                                </p>
                                <p className="text-muted-foreground">
                                    {billing.street}
                                    <br />
                                    {billing.zipCode} {billing.city}, {billing.country}
                                </p>
                            </div>
                        )}
                    </AccountCard>
                </div>
            </div>
        </div>
    );
}

// Article manquant ou remplacé, une fois la préparation validée
function PreparationNote({ line }: { line: Parameters<typeof lineOutcome>[0] }) {
    if (line.preparedQuantity === null) return null;
    const { missing, substitute, refund } = lineOutcome(line);
    if (missing === 0) return null;
    return (
        <p
            className={`mt-1.5 inline-flex max-w-full rounded-full px-2.5 py-0.5 text-xs font-bold ${
                substitute ? "bg-secondary text-primary" : "bg-promo/10 text-promo"
            }`}
        >
            <span className="truncate">
                {substitute
                    ? `${missing} remplacé${missing > 1 ? "s" : ""} par ${substitute.name}`
                    : `${missing} manquant${missing > 1 ? "s" : ""} en rayon`}
                {refund > 0 && ` · ${formatPrice(refund)} remboursés`}
            </span>
        </p>
    );
}
