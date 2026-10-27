import type { Metadata } from "next";
import Link from "next/link";
import { Eye, ShoppingBag, Store, Truck } from "lucide-react";
import { ORDER_FILTERS, articleCount, getAdminOrders, orderTotal, parseAdminParams } from "@/lib/admin/queries";
import { orderNumber } from "@/lib/account";
import { formatPrice } from "@/lib/format";
import { AdminPageHeader, AdminPagination, AdminTable, EmptyState, Panel, Td, Th, adminHref, formatDate } from "@/components/admin/admin-ui";
import { AdminFilterTabs, AdminSearch, AdminSelectFilter } from "@/components/admin/admin-toolbar";
import { OrderNumber, OrderStatusBadge, customerName, pickupLabel } from "@/components/admin/admin-bits";
import { CancelOrderButton, DeleteOrderButton, InvoiceButton } from "@/components/admin/order-actions";
import { canCancelOrder } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commandes" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseAdminParams(await searchParams);
  const { orders, total, page, pageCount, counts, stores } = await getAdminOrders(params);
  const href = (p: number) => adminHref("/admin/orders", { q: params.q, filtre: params.filter, magasin: params.magasin, page: p });

  return (
    <div>
      <AdminPageHeader title="Commandes" description="Commandes des drives Trinity, du plus récent au plus ancien." />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <AdminSearch placeholder="N° de commande, nom ou e-mail du client" />
          <AdminSelectFilter label="Tous les magasins" param="magasin" options={stores} value={params.magasin} />
        </div>
        <AdminFilterTabs filters={ORDER_FILTERS} active={params.filter} counts={counts} />
      </div>

      <Panel padded={false}>
        {orders.length ? (
          <>
            <AdminTable>
              <thead>
                <tr>
                  <Th>Commande</Th>
                  <Th>Client</Th>
                  <Th>Réception</Th>
                  <Th className="text-right">Articles</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Statut</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-muted/30">
                    <Td>
                      <Link href={`/admin/orders/${order.id}`} className="hover:text-primary hover:underline">
                        <OrderNumber id={order.id} />
                      </Link>
                      <span className="block text-xs text-muted-foreground">{formatDate(order.createdAt, true)}</span>
                    </Td>
                    <Td>
                      <span className="block font-semibold">{customerName(order.user)}</span>
                      <span className="block text-xs text-muted-foreground">{order.user.email}</span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {order.shippingAddressId ? <Truck size={14} aria-hidden /> : <Store size={14} aria-hidden />}
                        {order.shippingAddressId ? "Livraison" : "Drive"}
                      </span>
                      <span className="block">{pickupLabel(order.pickupSlot)}</span>
                      {order.store && <span className="block text-xs text-muted-foreground">{order.store.name}</span>}
                    </Td>
                    <Td className="text-right tabular-nums">{articleCount(order)}</Td>
                    <Td className="text-right font-black tabular-nums">{formatPrice(orderTotal(order))}</Td>
                    <Td>
                      <OrderStatusBadge status={order.status} delivery={!!order.shippingAddressId} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          aria-label={`Voir la commande ${orderNumber(order.id)}`}
                          title="Voir le détail"
                          className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <Eye size={16} aria-hidden />
                        </Link>
                        <InvoiceButton orderId={order.id} />
                        {canCancelOrder(order.status) && <CancelOrderButton orderId={order.id} number={orderNumber(order.id)} />}
                        {order.status === "cancelled" && <DeleteOrderButton orderId={order.id} number={orderNumber(order.id)} />}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
            <AdminPagination page={page} pageCount={pageCount} total={total} href={href} unit={["commande", "commandes"]} />
          </>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title={params.q ? `Aucune commande pour « ${params.q} »` : "Aucune commande"}
            text="Les commandes validées par les clients apparaîtront ici."
          />
        )}
      </Panel>
    </div>
  );
}
