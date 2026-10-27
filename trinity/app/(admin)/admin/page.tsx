import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CreditCard, Euro, Package, ShoppingBag, ShoppingBasket, Trophy, Users } from "lucide-react";
import { getDashboard, LOW_STOCK, orderTotal } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/format";
import { AdminPageHeader, EmptyState, Panel, StatCard, formatDate } from "@/components/admin/admin-ui";
import { OrderNumber, OrderStatusBadge, ProductThumb, StockBadge, customerName, pickupLabel } from "@/components/admin/admin-bits";
import { RevenueChart, SignupsChart } from "@/components/admin/dashboard-charts";
import { backOfficePage } from "@/lib/admin/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tableau de bord" };

export default async function AdminDashboardPage() {
  // Siège : tout le réseau ; compte magasin : son seul magasin
  const { store } = await backOfficePage();
  const data = await getDashboard(store?.id);
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  // Fiche d'un produit : le catalogue pour le siège, son stock pour un compte magasin
  const productHref = (product: { id: string; barCode: bigint }) =>
    store ? `/admin/stocks?q=${product.barCode.toString()}` : `/admin/products/${product.id}`;

  return (
    <div>
      <AdminPageHeader
        title="Tableau de bord"
        description={`${store ? `Activité de ${store.name}` : "Activité des drives Trinity"} · ${today}`}
        actions={
          <Link
            href="/admin/orders"
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
          >
            <ShoppingBag size={16} aria-hidden /> Voir les commandes
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chiffre d'affaires · 30 j"
          value={formatPrice(data.revenue)}
          hint={`${data.periodOrderCount} commande${data.periodOrderCount > 1 ? "s" : ""} sur la période`}
          icon={Euro}
        />
        <StatCard
          label="Panier moyen · 30 j"
          value={data.periodOrderCount ? formatPrice(data.averageBasket) : "—"}
          hint={`${data.orderCount} commande${data.orderCount > 1 ? "s" : ""} au total`}
          icon={ShoppingBasket}
          tone="highlight"
          href="/admin/orders"
        />
        <StatCard
          label={store ? "Clients du magasin" : "Clients"}
          value={data.customerCount}
          hint={`${data.newCustomers} nouveau${data.newCustomers > 1 ? "x" : ""} sur 30 jours · ${data.loyaltyCards} Carte${data.loyaltyCards > 1 ? "s" : ""} Trinity`}
          icon={Users}
          tone="bio"
          href={store ? undefined : "/admin/users"}
        />
        <StatCard
          label={store ? "Ruptures" : "Ruptures (réseau)"}
          value={data.ruptureCount}
          hint={`${data.lowStockCount} stock${data.lowStockCount > 1 ? "s" : ""} faible${data.lowStockCount > 1 ? "s" : ""} (moins de ${LOW_STOCK} unités)`}
          icon={AlertTriangle}
          tone={data.ruptureCount > 0 ? "promo" : "muted"}
          href="/admin/stocks?filtre=rupture"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel
          title="Chiffre d'affaires"
          description="Montant des commandes jour par jour, sur les 30 derniers jours"
          className="xl:col-span-2"
        >
          <RevenueChart data={data.revenueByDay} />
        </Panel>

        <Panel title="Inscriptions" description={store ? "Nouveaux clients du magasin par mois" : "Nouveaux comptes par mois"}>
          <SignupsChart data={data.signupsByMonth} />
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-secondary p-3 text-sm">
            <CreditCard size={18} className="shrink-0 text-primary" aria-hidden />
            <p>
              <span className="font-bold">{data.loyaltyCards}</span> client{data.loyaltyCards > 1 ? "s ont" : " a"} activé la Carte Trinity
            </p>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel
          title="Dernières commandes"
          className="xl:col-span-2"
          padded={false}
          action={
            <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              Toutes <ArrowRight size={14} aria-hidden />
            </Link>
          }
        >
          {data.recentOrders.length ? (
            <ul className="divide-y">
              {data.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <OrderNumber id={order.id} />
                        <OrderStatusBadge status={order.status} delivery={!!order.shippingAddressId} />
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {customerName(order.user)} · {order.shippingAddressId ? "livraison" : "drive"} ·{" "}
                        {order.pickupSlot ? pickupLabel(order.pickupSlot) : `passée le ${formatDate(order.createdAt)}`}
                      </span>
                    </span>
                    <span className="text-base font-black tabular-nums">{formatPrice(orderTotal(order))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ShoppingBag} title="Aucune commande pour le moment" />
          )}
        </Panel>

        <Panel
          title="À réapprovisionner"
          description={`Produits en ligne sous ${LOW_STOCK} unités`}
          padded={false}
          action={
            <Link href="/admin/stocks?filtre=faible" className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              Stocks <ArrowRight size={14} aria-hidden />
            </Link>
          }
        >
          {data.lowStocks.length ? (
            <ul className="divide-y">
              {data.lowStocks.map((stock) => (
                <li key={stock.id} className="flex items-center gap-3 px-5 py-3">
                  <ProductThumb src={stock.product.picture} alt="" size="sm" />
                  <span className="min-w-0 flex-1">
                    <Link href={productHref(stock.product)} className="block truncate text-sm font-semibold hover:text-primary hover:underline">
                      {stock.product.name}
                    </Link>
                    {!store && (
                      <Link href={`/admin/stocks?magasin=${stock.store.slug}&filtre=faible`} className="block truncate text-xs text-muted-foreground hover:underline">
                        {stock.store.name}
                      </Link>
                    )}
                  </span>
                  <StockBadge quantity={stock.quantity} low={LOW_STOCK} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Package} title="Tous les stocks sont suffisants" />
          )}
        </Panel>
      </div>

      <Panel title="Meilleures ventes" description="Produits les plus commandés" className="mt-6" padded={false}>
        {data.topProducts.length ? (
          <ol className="grid divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5">
            {data.topProducts.map(({ product, quantity }, index) => (
              <li key={product.id} className="flex items-center gap-3 p-5">
                <span className="relative">
                  <ProductThumb src={product.picture} alt="" />
                  <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-highlight text-xs font-black text-brand-dark">
                    {index + 1}
                  </span>
                </span>
                <span className="min-w-0">
                  <Link href={productHref(product)} className="line-clamp-2 text-sm font-semibold hover:text-primary hover:underline">
                    {product.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {quantity} vendu{quantity > 1 ? "s" : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon={Trophy} title="Pas encore de ventes" text="Les produits les plus commandés apparaîtront ici." />
        )}
      </Panel>
    </div>
  );
}
