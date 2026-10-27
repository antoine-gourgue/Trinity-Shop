import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Store, Truck } from "lucide-react";
import prisma from "@/lib/prisma";
import { getPreparationQueue, parseAdminParams } from "@/lib/admin/queries";
import { backOfficePage } from "@/lib/admin/access";
import { AdminPageHeader, EmptyState, Panel } from "@/components/admin/admin-ui";
import { AdminSelectFilter } from "@/components/admin/admin-toolbar";
import { OrderNumber, OrderStatusBadge, customerName, pickupLabel } from "@/components/admin/admin-bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Préparation" };

// Jour du créneau, pour regrouper la file : « mardi 28 octobre », ou « Sans créneau »
function slotDay(slot: Date | null) {
  return slot
    ? slot.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" })
    : "Sans créneau";
}

// File de préparation : commandes reçues ou en cours, dans l'ordre de leurs créneaux
export default async function PreparationQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { store } = await backOfficePage();
  const requested = parseAdminParams(await searchParams);
  const storeSlug = store ? store.slug : requested.magasin;
  const [orders, stores] = await Promise.all([
    getPreparationQueue(storeSlug),
    store ? [] : prisma.store.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const days = new Map<string, typeof orders>();
  for (const order of orders) {
    const day = slotDay(order.pickupSlot);
    days.set(day, [...(days.get(day) ?? []), order]);
  }

  return (
    <div>
      <AdminPageHeader
        title="Préparation"
        description={`${store ? `Commandes à préparer à ${store.name}` : "Commandes à préparer dans les drives Trinity"}, dans l'ordre des créneaux.`}
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

      {orders.length === 0 ? (
        <Panel>
          <EmptyState icon={ClipboardCheck} title="Aucune commande à préparer" text="Les nouvelles commandes apparaîtront ici, par créneau." />
        </Panel>
      ) : (
        <div className="space-y-6">
          {[...days].map(([day, dayOrders]) => (
            <section key={day}>
              <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{day}</h2>
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dayOrders.map((order) => {
                  const lines = order.cart.productsInCart;
                  const articles = lines.reduce((total, line) => total + line.quantity, 0);
                  const done = lines.filter((line) => line.preparedQuantity !== null).length;
                  const delivery = !!order.shippingAddressId;
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/admin/preparation/${order.id}`}
                        className="flex h-full flex-col gap-3 rounded-3xl border bg-white p-4 transition-shadow hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <OrderNumber id={order.id} />
                            <p className="text-sm font-semibold">{customerName(order.user)}</p>
                          </div>
                          <OrderStatusBadge status={order.status} delivery={delivery} />
                        </div>
                        <p className="flex items-center gap-2 text-sm">
                          {delivery ? <Truck size={16} className="text-primary" aria-hidden /> : <Store size={16} className="text-primary" aria-hidden />}
                          <span className="font-bold">{delivery ? "Livraison" : "Drive"}</span>
                          <span className="text-muted-foreground">{pickupLabel(order.pickupSlot)}</span>
                        </p>
                        {!store && order.store && <p className="text-xs text-muted-foreground">{order.store.name}</p>}
                        <div>
                          <div className="flex justify-between text-xs font-bold text-muted-foreground">
                            <span>
                              {articles} article{articles > 1 ? "s" : ""}
                            </span>
                            <span>
                              {done} produit{done > 1 ? "s" : ""} traité{done > 1 ? "s" : ""} sur {lines.length}
                            </span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${lines.length ? (done / lines.length) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <span className="mt-auto flex items-center gap-1 text-sm font-bold text-primary">
                          {done > 0 ? "Reprendre la préparation" : "Préparer"} <ArrowRight size={14} aria-hidden />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
