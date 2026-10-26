import type { Metadata } from "next";
import Link from "next/link";
import { Package, Pencil, Plus } from "lucide-react";
import { LOW_STOCK, PRODUCT_FILTERS, getAdminProducts, parseAdminParams } from "@/lib/admin/queries";
import { discountPercent, formatBrand, formatPrice } from "@/lib/format";
import NutriScore from "@/components/product/nutri-score";
import { AdminPageHeader, AdminPagination, AdminTable, Badge, EmptyState, Panel, Td, Th, adminHref } from "@/components/admin/admin-ui";
import { AdminFilterTabs, AdminSearch, AdminSelectFilter } from "@/components/admin/admin-toolbar";
import { ProductThumb, StockBadge } from "@/components/admin/admin-bits";
import { DeleteProductButton, VisibilityButton } from "@/components/admin/product-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Produits" };

const ICON_LINK =
  "flex h-9 w-9 items-center justify-center rounded-full border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-primary";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseAdminParams(await searchParams);
  const { products, total, page, pageCount, counts, rayons } = await getAdminProducts(params);
  const href = (p: number) => adminHref("/admin/products", { q: params.q, filtre: params.filter, rayon: params.rayon, page: p });

  return (
    <div>
      <AdminPageHeader
        title="Produits"
        description="Catalogue du drive : prix, promotions, stock et visibilité en ligne."
        actions={
          <Link
            href="/admin/products/new"
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
          >
            <Plus size={16} aria-hidden /> Nouveau produit
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <AdminSearch placeholder="Nom, marque ou code-barres" />
          <AdminSelectFilter label="Tous les rayons" param="rayon" options={rayons} value={params.rayon} />
        </div>
        <AdminFilterTabs filters={PRODUCT_FILTERS} active={params.filter} counts={counts} />
      </div>

      <Panel padded={false}>
        {products.length ? (
          <>
            <AdminTable>
              <thead>
                <tr>
                  <Th>Produit</Th>
                  <Th>Rayon</Th>
                  <Th className="text-right">Prix</Th>
                  <Th>Stock</Th>
                  <Th>Nutri-Score</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const discount = discountPercent(product.price, product.regularPrice);
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-muted/30">
                      <Td>
                        <div className="flex items-center gap-3">
                          <ProductThumb src={product.picture} alt="" />
                          <div className="min-w-0 max-w-xs">
                            <Link href={`/admin/products/${product.id}`} className="line-clamp-2 font-semibold hover:text-primary hover:underline">
                              {product.name}
                            </Link>
                            {product.hidden && (
                              <span className="mt-0.5 inline-block">
                                <Badge tone="dark">Masqué</Badge>
                              </span>
                            )}
                            <p className="truncate text-xs text-muted-foreground">
                              {formatBrand(product.brand.name)}
                              {product.netContent && ` · ${product.netContent}`} · {product.barCode.toString()}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-muted-foreground">{product.rayon ?? "—"}</Td>
                      <Td className="text-right">
                        <span className={discount ? "font-black text-promo" : "font-black"}>{formatPrice(product.price)}</span>
                        {discount && product.regularPrice && (
                          <span className="block text-xs text-muted-foreground">
                            <s>{formatPrice(product.regularPrice)}</s> · −{discount} %
                          </span>
                        )}
                      </Td>
                      <Td>
                        {product.stock ? <StockBadge quantity={product.stock.quantity} low={LOW_STOCK} /> : <Badge tone="danger">Aucun stock</Badge>}
                      </Td>
                      <Td>
                        <NutriScore grade={product.nutriScore} className="h-6" />
                      </Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/products/${product.id}`} aria-label={`Modifier ${product.name}`} title="Modifier" className={ICON_LINK}>
                            <Pencil size={16} aria-hidden />
                          </Link>
                          <VisibilityButton productId={product.id} hidden={product.hidden} />
                          <DeleteProductButton productId={product.id} name={product.name} />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTable>
            <AdminPagination page={page} pageCount={pageCount} total={total} href={href} unit={["produit", "produits"]} />
          </>
        ) : (
          <EmptyState
            icon={Package}
            title={params.q ? `Aucun produit pour « ${params.q} »` : "Aucun produit"}
            text="Modifiez la recherche ou les filtres."
          />
        )}
      </Panel>
    </div>
  );
}
