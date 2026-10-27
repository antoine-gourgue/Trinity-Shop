import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Boxes, ChevronRight, PackageX, Pencil } from "lucide-react";
import { LOW_STOCK, STOCK_FILTERS, getAdminStocks, parseAdminParams } from "@/lib/admin/queries";
import { formatBrand } from "@/lib/format";
import { AdminPageHeader, AdminPagination, AdminTable, Badge, EmptyState, Panel, StatCard, Td, Th, adminHref, formatDate } from "@/components/admin/admin-ui";
import { AdminFilterTabs, AdminSearch, AdminSelectFilter } from "@/components/admin/admin-toolbar";
import { ProductThumb, StockBadge } from "@/components/admin/admin-bits";
import { backOfficePage } from "@/lib/admin/access";
import { daysLeft, daysLeftLabel, formatBestBefore } from "@/lib/anti-gaspi";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stocks" };

const units = new Intl.NumberFormat("fr-FR");

export default async function AdminStocksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { store } = await backOfficePage();
  // Un compte magasin ne voit et n'ajuste que le stock de son magasin
  const requested = parseAdminParams(await searchParams);
  const params = store ? { ...requested, magasin: store.slug } : requested;
  const data = await getAdminStocks(params);
  const href = (p: number) => adminHref("/admin/stocks", { q: params.q, filtre: params.filter, magasin: params.magasin, page: p });
  const filterHref = (filtre: string) => adminHref("/admin/stocks", { filtre, magasin: params.magasin });
  // Sans magasin choisi : une ligne par magasin et par produit, avec le nom du magasin
  const allStores = !params.magasin;

  return (
    <div>
      <AdminPageHeader
        title="Stocks"
        description={
          store
            ? `Stock de ${store.name}, par lots datés. Ouvrez un produit pour voir ses lots, leurs commandes, son réassort, et le corriger après comptage.`
            : "Stock de chaque magasin, par lots datés. Choisissez un magasin, puis ouvrez un produit pour voir ses lots et le corriger après comptage."
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={allStores ? "Unités en stock (réseau)" : "Unités en stock"}
          value={units.format(data.units)}
          hint={`${units.format(data.counts.tous)} ${allStores ? "stocks de magasin" : "références"}`}
          icon={Boxes}
        />
        <StatCard
          label="Stock faible"
          value={data.counts.faible}
          hint={`Moins de ${LOW_STOCK} unités`}
          icon={AlertTriangle}
          tone={data.counts.faible ? "highlight" : "muted"}
          href={filterHref("faible")}
        />
        <StatCard
          label="En rupture"
          value={data.counts.rupture}
          hint="À réapprovisionner en priorité"
          icon={PackageX}
          tone={data.counts.rupture ? "promo" : "muted"}
          href={filterHref("rupture")}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <AdminSearch placeholder="Nom, marque ou code-barres" />
          {!store && <AdminSelectFilter label="Tous les magasins" param="magasin" options={data.stores} value={params.magasin} />}
        </div>
        <AdminFilterTabs filters={STOCK_FILTERS} active={params.filter} counts={data.counts} />
      </div>

      <Panel padded={false}>
        {data.stocks.length ? (
          <>
            <AdminTable>
              <thead>
                <tr>
                  <Th>Produit</Th>
                  {allStores && <Th>Magasin</Th>}
                  <Th>Disponible</Th>
                  <Th>Date la plus proche</Th>
                  <Th>Mis à jour</Th>
                  <Th className="text-right">Lots</Th>
                </tr>
              </thead>
              <tbody>
                {data.stocks.map((stock) => (
                  <tr key={stock.id} className="transition-colors hover:bg-muted/30">
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProductThumb src={stock.product.picture} alt="" />
                        <div className="min-w-0 max-w-sm">
                          {/* Lots du produit dans ce magasin, leurs commandes et le réassort */}
                          <Link href={`/admin/stocks/${stock.id}`} className="line-clamp-2 font-semibold hover:text-primary hover:underline">
                            {stock.product.name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatBrand(stock.product.brand.name)} · {stock.product.barCode.toString()}
                          </p>
                          {stock.product.hidden && (
                            <span className="mt-0.5 inline-block">
                              <Badge tone="dark">Masqué</Badge>
                            </span>
                          )}
                        </div>
                      </div>
                    </Td>
                    {allStores && <Td className="whitespace-nowrap text-sm">{stock.store.name}</Td>}
                    <Td>
                      <StockBadge quantity={stock.quantity} low={LOW_STOCK} />
                    </Td>
                    <Td className="whitespace-nowrap text-sm">
                      {stock.nextBestBefore ? (
                        <span className={daysLeft(stock.nextBestBefore) <= 2 ? "font-bold text-promo" : undefined}>
                          {formatBestBefore(stock.nextBestBefore)}
                          <span className="block text-xs text-muted-foreground">{daysLeftLabel(daysLeft(stock.nextBestBefore))}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDate(stock.updatedAt, true)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/stocks/${stock.id}`}
                          aria-label={`Voir les lots de ${stock.product.name}`}
                          className="flex h-9 items-center gap-1 whitespace-nowrap rounded-full border bg-white pl-3 pr-2 text-xs font-bold text-primary transition-colors hover:border-primary hover:bg-secondary"
                        >
                          Voir les lots <ChevronRight size={14} aria-hidden />
                        </Link>
                        {!store && (
                          <Link
                            href={`/admin/products/${stock.product.id}`}
                            aria-label={`Modifier ${stock.product.name}`}
                            title="Modifier le produit"
                            className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <Pencil size={16} aria-hidden />
                          </Link>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
            <AdminPagination
              page={data.page}
              pageCount={data.pageCount}
              total={data.total}
              href={href}
              unit={allStores ? ["stock", "stocks"] : ["référence", "références"]}
            />
          </>
        ) : (
          <EmptyState
            icon={Boxes}
            title={params.filter === "rupture" ? "Aucun produit en rupture" : params.q ? `Aucun stock pour « ${params.q} »` : "Aucun stock"}
            text={params.filter === "rupture" ? "Tous les produits sont disponibles." : undefined}
          />
        )}
      </Panel>
    </div>
  );
}
