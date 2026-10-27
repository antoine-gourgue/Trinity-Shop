import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, PackageCheck, Sparkles, Truck } from "lucide-react";
import prisma from "@/lib/prisma";
import { getRestockBoard, parseAdminParams, type AdminRestockOrder } from "@/lib/admin/queries";
import { backOfficePage } from "@/lib/admin/access";
import { formatBestBefore, lotDay } from "@/lib/anti-gaspi";
import { bestBeforeIn } from "@/lib/shelf-life";
import { REORDER_POINT, formatDelivery } from "@/lib/restock";
import { AdminPageHeader, Badge, EmptyState, Panel, StatCard, formatDate } from "@/components/admin/admin-ui";
import { AdminSelectFilter } from "@/components/admin/admin-toolbar";
import { ProductThumb } from "@/components/admin/admin-bits";
import RestockForm from "@/components/admin/restock/restock-form";
import ReceiveButton from "@/components/admin/restock/receive-button";
import QuickOrderButton from "@/components/admin/restock/quick-order-button";
import CancelRestockButton from "@/components/admin/restock/cancel-restock-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Réassort" };

function RestockRow({ order, showStore, children }: { order: AdminRestockOrder; showStore: boolean; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
      <ProductThumb src={order.product.picture} alt="" size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{order.product.name}</span>
          {order.automatic && <Badge tone="muted">Automatique</Badge>}
        </span>
        <span className="block text-xs text-muted-foreground">
          {[
            `${order.receivedQuantity ?? order.quantity} unité${(order.receivedQuantity ?? order.quantity) > 1 ? "s" : ""}`,
            order.lot ? `lot jusqu'au ${formatBestBefore(order.lot.bestBefore)}` : `commandé le ${formatDate(order.orderedAt)}`,
            showStore ? order.store.name : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      {children}
    </li>
  );
}

// Réassort : livraisons à réceptionner (elles deviennent des lots datés), commandes en route, produits
// à recommander et réceptions de la semaine
export default async function RestockPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { store } = await backOfficePage();
  const requested = parseAdminParams(await searchParams);
  const stores = store ? [] : await prisma.store.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } });
  const filtered = !store && requested.magasin ? stores.find((entry) => entry.slug === requested.magasin) : undefined;
  const storeId = store?.id ?? filtered?.id;
  const board = await getRestockBoard(storeId);
  const showStore = !storeId;
  const minBestBefore = lotDay(bestBeforeIn(1));

  return (
    <div>
      <AdminPageHeader
        title="Réassort"
        description={`${store ? `Commandes de ${store.name}` : "Commandes des drives Trinity"} : livrées le lendemain, elles entrent en stock comme un lot daté à la réception.`}
      />
      {!store && (
        <div className="mb-4 sm:max-w-xs">
          <AdminSelectFilter
            label="Tous les magasins"
            param="magasin"
            options={stores.map((entry) => ({ value: entry.slug, label: entry.name }))}
            value={requested.magasin}
          />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="À réceptionner" value={board.toReceive.length} hint="Livraisons arrivées" icon={PackageCheck} tone={board.toReceive.length ? "highlight" : "muted"} />
        <StatCard label="En livraison" value={board.inDelivery.length} hint="Commandées, livrées demain" icon={Truck} />
        <StatCard
          label="À recommander"
          value={storeId ? board.suggestions.length : "—"}
          hint={storeId ? `Produits sous ${REORDER_POINT} unités` : "Choisissez un magasin"}
          icon={Sparkles}
          tone={board.suggestions.length ? "promo" : "muted"}
        />
        <StatCard label="Réceptionnés · 7 j" value={board.received.length} hint="Lots entrés en stock" icon={ClipboardList} tone="bio" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Panel title="Commander un produit" description="Livraison le lendemain ; la nuit, un réassort automatique complète les produits sous le seuil.">
          <RestockForm key={filtered?.id} stores={store ? null : stores.map(({ id, name }) => ({ id, name }))} defaultStoreId={filtered?.id} />
        </Panel>

        <div className="space-y-6 xl:col-span-2">
          <Panel title="À réceptionner" description="Vérifiez la quantité et la date limite des colis" padded={false}>
            {board.toReceive.length ? (
              <ul className="divide-y">
                {board.toReceive.map((order) => (
                  <RestockRow key={order.id} order={order} showStore={showStore}>
                    <ReceiveButton
                      orderId={order.id}
                      productName={order.product.name}
                      quantity={order.quantity}
                      suggestedBestBefore={lotDay(bestBeforeIn(order.product.shelfLifeDays))}
                      minBestBefore={minBestBefore}
                    />
                    <CancelRestockButton orderId={order.id} productName={order.product.name} />
                  </RestockRow>
                ))}
              </ul>
            ) : (
              <EmptyState icon={PackageCheck} title="Aucune livraison à réceptionner" />
            )}
          </Panel>

          {storeId && board.suggestions.length > 0 && (
            <Panel title="À recommander" description="Sous le seuil, sans commande en cours ; quantité pour deux semaines de ventes" padded={false}>
              <ul className="divide-y">
                {board.suggestions.map((suggestion) => (
                  <li key={suggestion.product.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
                    <ProductThumb src={suggestion.product.picture} alt="" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{suggestion.product.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {suggestion.quantity} en stock · {suggestion.sold} vendu{suggestion.sold > 1 ? "s" : ""} en deux semaines
                      </span>
                    </span>
                    <QuickOrderButton
                      storeId={storeId}
                      productId={suggestion.product.id}
                      productName={suggestion.product.name}
                      quantity={suggestion.suggested}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="En livraison" padded={false}>
            {board.inDelivery.length ? (
              <ul className="divide-y">
                {board.inDelivery.map((order) => (
                  <RestockRow key={order.id} order={order} showStore={showStore}>
                    <Badge tone="brand">Livraison {formatDelivery(order.expectedAt)}</Badge>
                    {/* Livraison arrivée en avance */}
                    <ReceiveButton
                      orderId={order.id}
                      productName={order.product.name}
                      quantity={order.quantity}
                      suggestedBestBefore={lotDay(bestBeforeIn(order.product.shelfLifeDays))}
                      minBestBefore={minBestBefore}
                    />
                    <CancelRestockButton orderId={order.id} productName={order.product.name} />
                  </RestockRow>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Truck} title="Aucune commande en route" />
            )}
          </Panel>

          {board.received.length > 0 && (
            <Panel title="Réceptionnés cette semaine" padded={false}>
              <ul className="divide-y">
                {board.received.map((order) => (
                  <RestockRow key={order.id} order={order} showStore={showStore}>
                    <span className="text-xs text-muted-foreground">{order.receivedAt ? formatDate(order.receivedAt, true) : ""}</span>
                  </RestockRow>
                ))}
              </ul>
            </Panel>
          )}

          {!storeId && (
            <p className="text-sm text-muted-foreground">
              Choisissez un magasin pour voir les produits à recommander, ou ouvrez un produit depuis les{" "}
              <Link href="/admin/stocks" className="font-bold text-primary hover:underline">
                stocks
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
