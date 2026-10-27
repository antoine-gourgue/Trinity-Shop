import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, CalendarClock, Layers, ShieldCheck } from "lucide-react";
import { getStockDetail, LOW_STOCK, type StockDetail } from "@/lib/admin/queries";
import { backOfficePage } from "@/lib/admin/access";
import { orderNumber } from "@/lib/account";
import { daysLeft, daysLeftLabel, formatBestBefore, lotDay, lotPricing, lotStage } from "@/lib/anti-gaspi";
import { formatBrand, formatPrice } from "@/lib/format";
import { formatDelivery, suggestedQuantity } from "@/lib/restock";
import { AdminPageHeader, Badge, EmptyState, Panel, StatCard, formatDate } from "@/components/admin/admin-ui";
import { StockBadge, customerName } from "@/components/admin/admin-bits";
import LotActions from "@/components/admin/anti-gaspi/lot-actions";
import QuickOrderButton from "@/components/admin/restock/quick-order-button";
import StockCountButton from "@/components/admin/stock-count-button";
import { bestBeforeIn } from "@/lib/shelf-life";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stock" };

type Lot = StockDetail["lots"][number];

// Ce qui est sorti d'un lot : vendu, donné, jeté, corrigé à l'inventaire
function lotOutcomes(lot: Lot) {
  return [
    lot.soldQuantity > 0 && `${lot.soldQuantity} vendu${lot.soldQuantity > 1 ? "s" : ""}`,
    lot.donatedQuantity > 0 && `${lot.donatedQuantity} donné${lot.donatedQuantity > 1 ? "s" : ""}`,
    lot.wastedQuantity > 0 && `${lot.wastedQuantity} jeté${lot.wastedQuantity > 1 ? "s" : ""}`,
    lot.adjustedQuantity > 0 && `${lot.adjustedQuantity} corrigé${lot.adjustedQuantity > 1 ? "s" : ""} à l'inventaire`,
  ].filter(Boolean);
}

function LotStatus({ lot, price }: { lot: Lot; price: number }) {
  if (lot.closedAt) return <Badge tone="muted">Clos le {formatDate(lot.closedAt)}</Badge>;
  switch (lotStage(lot)) {
    case "expired":
      return <Badge tone="danger">Périmé, à jeter</Badge>;
    case "last-day":
      return <Badge tone="warning">Dernier jour, à donner</Badge>;
    case "on-sale":
      return <Badge tone="success">Anti-gaspi −{lotPricing(lot, price)?.percent} %</Badge>;
    case "in-stock":
      return <Badge tone="brand">En rayon</Badge>;
  }
}

// Stock d'un produit dans un magasin : ses lots datés, les commandes servies par chacun et son réassort
export default async function StockPage({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await backOfficePage();
  const stock = await getStockDetail((await params).id);
  // Le stock d'un autre magasin n'existe pas pour un compte magasin
  if (!stock || (store && stock.storeId !== store.id)) notFound();

  // Lots en vente (les lots périmés, retirés de la vente, attendent d'être jetés)
  const openLots = stock.lots.filter((lot) => !lot.closedAt && !lot.withdrawnAt);
  const nearest = openLots[0]?.bestBefore ?? null;
  const pending = stock.restocks.filter((order) => order.status === "ordered");
  const traced = stock.lots.filter((lot) => lot.allocations.length > 0);
  // Quantité à commander pour remonter au stock visé : rien à proposer au-dessus
  const toOrder = suggestedQuantity(stock.quantity, 0);

  return (
    <div>
      <AdminPageHeader
        back={{ href: store ? "/admin/stocks" : `/admin/stocks?magasin=${stock.store.slug}`, label: "Stocks" }}
        title={stock.product.name}
        description={[formatBrand(stock.product.brand.name), stock.product.netContent, stock.product.barCode.toString(), stock.store.name]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <StockCountButton
              stockId={stock.id}
              productName={stock.product.name}
              quantity={stock.quantity}
              suggestedBestBefore={lotDay(bestBeforeIn(stock.product.shelfLifeDays))}
              minBestBefore={lotDay(bestBeforeIn(1))}
            />
            {pending.length === 0 && toOrder > 0 && (
              <QuickOrderButton storeId={stock.storeId} productId={stock.productId} productName={stock.product.name} quantity={toOrder} />
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="En stock" value={<StockBadge quantity={stock.quantity} low={LOW_STOCK} />} hint={`${stock.quantity} unités`} icon={Boxes} />
        <StatCard label="Lots en rayon" value={openLots.length} hint="Les clients reçoivent les dates les plus longues" icon={Layers} />
        <StatCard
          label="Date la plus proche"
          // Date courte en grand (la carte est étroite), jour de la semaine en dessous
          value={nearest ? nearest.toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "short" }) : "—"}
          hint={
            nearest
              ? `${nearest.toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long" })} · ${daysLeftLabel(daysLeft(nearest))}`
              : "Aucun lot ouvert"
          }
          icon={CalendarClock}
          tone={nearest && daysLeft(nearest) <= 2 ? "promo" : "brand"}
        />
        <StatCard
          label="Conservation"
          value={`${stock.product.shelfLifeDays} j`}
          hint={`Date proposée à la réception · prix ${formatPrice(stock.product.price)}`}
          icon={ShieldCheck}
          tone="bio"
        />
      </div>

      <Panel title="Lots" description="Lots en rayon (dates les plus proches d'abord), puis les derniers lots clos" padded={false}>
        {stock.lots.length ? (
          <ul className="divide-y">
            {stock.lots.map((lot) => {
              const outcomes = lotOutcomes(lot);
              return (
                <li key={lot.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">Jusqu&apos;au {formatBestBefore(lot.bestBefore)}</span>
                      <LotStatus lot={lot} price={stock.product.price} />
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {[
                        `${lot.quantity} / ${lot.initialQuantity} restant${lot.quantity > 1 ? "s" : ""}`,
                        `reçu le ${formatDate(lot.receivedAt)}${lot.restockOrder ? (lot.restockOrder.automatic ? " (réassort automatique)" : " (réassort)") : ""}`,
                        ...outcomes,
                      ].join(" · ")}
                    </span>
                  </span>
                  {!lot.closedAt && lot.quantity > 0 && lotStage(lot) !== "in-stock" && (
                    <LotActions lotId={lot.id} productName={stock.product.name} quantity={lot.quantity} expired={lotStage(lot) === "expired"} />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Layers} title="Aucun lot" text="Les lots arrivent avec le réassort." />
        )}
      </Panel>

      {/* Cadres de même hauteur, même quand l'un des deux est vide */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Traçabilité" description="Commandes servies par chaque lot : en cas de rappel, les clients concernés" padded={false}>
          {traced.length ? (
            <ul className="divide-y">
              {traced.map((lot) => (
                <li key={lot.id} className="px-5 py-3.5">
                  <p className="text-sm font-bold">Lot du {formatBestBefore(lot.bestBefore)}</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {lot.allocations.map((allocation, index) => {
                      const order = allocation.line.cart.orders[0];
                      return order ? (
                        <li key={`${order.id}-${index}`} className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
                          <Link href={`/admin/orders/${order.id}`} className="font-mono font-bold text-foreground hover:underline">
                            #{orderNumber(order.id)}
                          </Link>
                          <span>{customerName(order.user)}</span>
                          <span>
                            · {allocation.quantity} unité{allocation.quantity > 1 ? "s" : ""} · {formatDate(order.createdAt)}
                          </span>
                          {order.status === "cancelled" && <Badge tone="danger">Annulée</Badge>}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ShieldCheck} title="Aucune commande servie" text="Chaque article commandé garde le lot dont il vient." />
          )}
        </Panel>

        <Panel title="Réassort" description="Dernières commandes du produit pour ce magasin" padded={false}>
          {stock.restocks.length ? (
            <ul className="divide-y">
              {stock.restocks.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">
                      {order.receivedQuantity ?? order.quantity} unité{(order.receivedQuantity ?? order.quantity) > 1 ? "s" : ""}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Commandé le {formatDate(order.orderedAt)}
                      {order.automatic ? " · automatique" : ""}
                      {order.lot ? ` · lot jusqu'au ${formatBestBefore(order.lot.bestBefore)}` : ""}
                    </span>
                  </span>
                  {order.status === "ordered" ? (
                    <Link href="/admin/reassort" className="hover:underline">
                      <Badge tone="brand">Livraison {formatDelivery(order.expectedAt)}</Badge>
                    </Link>
                  ) : order.status === "received" ? (
                    <Badge tone="success">Réceptionné</Badge>
                  ) : (
                    <Badge tone="muted">Annulé</Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Boxes} title="Aucun réassort" text="Les commandes de ce produit pour ce magasin apparaîtront ici." />
          )}
        </Panel>
      </div>
    </div>
  );
}
