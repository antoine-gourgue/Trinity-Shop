import type { Metadata } from "next";
import Link from "next/link";
import { Car, Clock, PackageCheck } from "lucide-react";
import prisma from "@/lib/prisma";
import { getDriveBoard, parseAdminParams, type DriveBoardOrder } from "@/lib/admin/queries";
import { formatMinutes } from "@/lib/admin/operations";
import { backOfficePage } from "@/lib/admin/access";
import { AdminPageHeader, EmptyState, Panel, StatCard } from "@/components/admin/admin-ui";
import { AdminSelectFilter } from "@/components/admin/admin-toolbar";
import { OrderNumber, customerName, pickupLabel } from "@/components/admin/admin-bits";
import AutoRefresh from "@/components/admin/drive/auto-refresh";
import WaitingTime from "@/components/admin/drive/waiting-time";
import HandOverButton from "@/components/admin/drive/hand-over-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Drive" };

function articleCount(order: DriveBoardOrder) {
  return order.cart.productsInCart.reduce((total, line) => total + line.quantity, 0);
}

// Drive : les clients arrivés sur le parking (place, attente), puis les commandes prêtes qui attendent
// leur client. La page se recharge seule pour afficher les nouvelles arrivées.
export default async function DrivePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { store } = await backOfficePage();
  const requested = parseAdminParams(await searchParams);
  const [filtered, stores] = await Promise.all([
    !store && requested.magasin ? prisma.store.findUnique({ where: { slug: requested.magasin }, select: { id: true } }) : null,
    store ? [] : prisma.store.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const board = await getDriveBoard(store?.id ?? filtered?.id);
  const arrived = board.orders.filter((order) => order.arrivedAt);
  const waiting = board.orders.filter((order) => !order.arrivedAt);

  return (
    <div>
      <AutoRefresh />
      <AdminPageHeader
        title="Drive"
        description={`${store ? `Parking drive de ${store.name}` : "Parkings drive Trinity"} · mis à jour automatiquement`}
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

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Sur le parking" value={arrived.length} hint="Clients arrivés, à servir" icon={Car} tone={arrived.length ? "highlight" : "muted"} />
        <StatCard label="Prêtes, client attendu" value={waiting.length} hint="Commandes prêtes au drive" icon={PackageCheck} />
        <StatCard
          label="Remises aujourd'hui"
          value={board.handedOverToday}
          hint={`Attente moyenne au parking : ${formatMinutes(board.today.averageMinutes)}`}
          icon={Clock}
          tone="bio"
        />
      </div>

      <Panel title="Sur le parking" description="Par ordre d'arrivée : servez d'abord ceux qui attendent depuis le plus longtemps">
        {arrived.length ? (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {arrived.map((order) => (
              <li key={order.id} className="flex flex-col gap-4 rounded-3xl border-2 border-highlight bg-highlight/10 p-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-dark text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-white/70">Place</span>
                    <span className="text-2xl font-black leading-none">{order.parkingSpot}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-black">{customerName(order.user)}</p>
                    <p className="text-sm">
                      Arrivé <WaitingTime since={order.arrivedAt!.toISOString()} />
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                        <OrderNumber id={order.id} />
                      </Link>
                      <span>
                        {articleCount(order)} article{articleCount(order) > 1 ? "s" : ""}
                      </span>
                      {!store && order.store && <span>{order.store.name}</span>}
                    </p>
                  </div>
                </div>
                <HandOverButton orderId={order.id} customer={customerName(order.user)} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Car} title="Aucun client sur le parking" text="Les clients qui touchent « Je suis arrivé » apparaissent ici avec leur place." />
        )}
      </Panel>

      <Panel title="Prêtes, en attente du client" className="mt-6" padded={false}>
        {waiting.length ? (
          <ul className="divide-y">
            {waiting.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                      <OrderNumber id={order.id} />
                    </Link>
                    <span className="truncate font-semibold">{customerName(order.user)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {pickupLabel(order.pickupSlot)} · {articleCount(order)} article{articleCount(order) > 1 ? "s" : ""}
                    {!store && order.store ? ` · ${order.store.name}` : ""}
                  </span>
                </span>
                <div className="w-full sm:w-48">
                  <HandOverButton orderId={order.id} customer={customerName(order.user)} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={PackageCheck} title="Aucune commande prête" text="Les commandes validées à la préparation apparaissent ici." />
        )}
      </Panel>
    </div>
  );
}
