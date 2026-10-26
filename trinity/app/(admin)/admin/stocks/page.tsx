import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Boxes, PackageX, Pencil } from "lucide-react";
import { LOW_STOCK, STOCK_FILTERS, getAdminStocks, parseAdminParams } from "@/lib/admin/queries";
import { formatBrand } from "@/lib/format";
import { AdminPageHeader, AdminPagination, AdminTable, Badge, EmptyState, Panel, StatCard, Td, Th, adminHref, formatDate } from "@/components/admin/admin-ui";
import { AdminFilterTabs, AdminSearch } from "@/components/admin/admin-toolbar";
import { ProductThumb, StockBadge } from "@/components/admin/admin-bits";
import StockEditor from "@/components/admin/stock-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stocks" };

const units = new Intl.NumberFormat("fr-FR");

export default async function AdminStocksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseAdminParams(await searchParams);
  const data = await getAdminStocks(params);
  const href = (p: number) => adminHref("/admin/stocks", { q: params.q, filtre: params.filter, page: p });

  return (
    <div>
      <AdminPageHeader title="Stocks" description="Quantités disponibles au drive. Ajustez-les directement dans la liste." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Unités en stock" value={units.format(data.units)} hint={`${units.format(data.counts.tous)} références`} icon={Boxes} />
        <StatCard
          label="Stock faible"
          value={data.counts.faible}
          hint={`Moins de ${LOW_STOCK} unités`}
          icon={AlertTriangle}
          tone={data.counts.faible ? "highlight" : "muted"}
          href="/admin/stocks?filtre=faible"
        />
        <StatCard
          label="En rupture"
          value={data.counts.rupture}
          hint="À réapprovisionner en priorité"
          icon={PackageX}
          tone={data.counts.rupture ? "promo" : "muted"}
          href="/admin/stocks?filtre=rupture"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <AdminSearch placeholder="Nom, marque ou code-barres" />
        <AdminFilterTabs filters={STOCK_FILTERS} active={params.filter} counts={data.counts} />
      </div>

      <Panel padded={false}>
        {data.stocks.length ? (
          <>
            <AdminTable>
              <thead>
                <tr>
                  <Th>Produit</Th>
                  <Th>Disponible</Th>
                  <Th>Mis à jour</Th>
                  <Th className="text-right">Ajuster le stock</Th>
                </tr>
              </thead>
              <tbody>
                {data.stocks.map((stock) => (
                  <tr key={stock.id} className="transition-colors hover:bg-muted/30">
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProductThumb src={stock.product.picture} alt="" />
                        <div className="min-w-0 max-w-sm">
                          <Link href={`/admin/products/${stock.product.id}`} className="line-clamp-2 font-semibold hover:text-primary hover:underline">
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
                    <Td>
                      <StockBadge quantity={stock.quantity} low={LOW_STOCK} />
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{formatDate(stock.updatedAt, true)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <StockEditor key={`${stock.id}-${stock.quantity}`} stockId={stock.id} quantity={stock.quantity} productName={stock.product.name} />
                        <Link
                          href={`/admin/products/${stock.product.id}`}
                          aria-label={`Modifier ${stock.product.name}`}
                          title="Modifier le produit"
                          className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <Pencil size={16} aria-hidden />
                        </Link>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
            <AdminPagination page={data.page} pageCount={data.pageCount} total={data.total} href={href} unit={["référence", "références"]} />
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
