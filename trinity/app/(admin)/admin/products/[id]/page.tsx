import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, ExternalLink, ShoppingBag } from "lucide-react";
import { getAdminProduct } from "@/lib/admin/queries";
import { discountPercent, formatBrand, formatPrice, toPriceInput } from "@/lib/format";
import NutriScore from "@/components/product/nutri-score";
import { AdminPageHeader, Badge, Panel, formatDate } from "@/components/admin/admin-ui";
import { NetworkStockBadge, ProductThumb } from "@/components/admin/admin-bits";
import { DeleteProductButton } from "@/components/admin/product-actions";
import ProductForm from "@/components/admin/product-form";
import { promoLastDay } from "@/lib/promotions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getAdminProduct((await params).id);
  return { title: data?.product.name ?? "Produit" };
}

export default async function AdminProductPage({ params }: Props) {
  const data = await getAdminProduct((await params).id);
  if (!data) notFound();
  const { product, categoryNames, brandNames, orderedCount } = data;
  const discount = discountPercent(product.price, product.regularPrice);

  return (
    <div>
      <AdminPageHeader
        back={{ href: "/admin/products", label: "Produits" }}
        title={product.name}
        description={`${formatBrand(product.brand.name)} · code-barres ${product.barCode.toString()}`}
        actions={<DeleteProductButton productId={product.id} name={product.name} label redirectTo="/admin/products" />}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ProductForm
          key={product.updatedAt.toISOString()}
          target={{ productId: product.id }}
          categoryNames={categoryNames}
          brandNames={brandNames}
          initial={{
            name: product.name,
            brand: product.brand.name,
            price: toPriceInput(product.price),
            regularPrice: product.regularPrice ? toPriceInput(product.regularPrice) : "",
            promoEndsAt: product.promoEndsAt ? promoLastDay(product.promoEndsAt) : "",
            netContent: product.netContent ?? "",
            description: product.description,
            nutriScore: product.nutriScore,
            categories: product.categories.map((c) => c.categoryName),
            hidden: product.hidden,
            // Le stock se gère magasin par magasin, dans la page Stocks
            stock: "",
          }}
        />

        <aside className="space-y-6 xl:sticky xl:top-8">
          <Panel>
            <div className="flex justify-center rounded-2xl bg-white">
              <ProductThumb src={product.picture} alt={product.name} size="lg" />
            </div>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-primary">{formatBrand(product.brand.name)}</p>
            <p className="font-extrabold leading-snug">{product.name}</p>
            {product.netContent && <p className="text-sm text-muted-foreground">{product.netContent}</p>}
            <div className="mt-3 flex items-end gap-2">
              <span className={discount ? "text-2xl font-black text-promo" : "text-2xl font-black"}>{formatPrice(product.price)}</span>
              {discount && product.regularPrice && (
                <span className="pb-1 text-sm text-muted-foreground">
                  <s>{formatPrice(product.regularPrice)}</s> · −{discount} %
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {product.hidden ? <Badge tone="muted">Masqué</Badge> : <Badge tone="success">En ligne</Badge>}
              <NetworkStockBadge {...product.stock} />
              <NutriScore grade={product.nutriScore} className="h-6" />
            </div>
          </Panel>

          <Panel title="Activité">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <ShoppingBag size={16} className="shrink-0 text-primary" aria-hidden />
                {orderedCount > 0 ? `Présent dans ${orderedCount} commande${orderedCount > 1 ? "s" : ""}` : "Jamais commandé"}
              </li>
              <li className="flex items-start gap-3">
                <Boxes size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                <span>
                  {product.stock.units} unités dans {product.stock.stores} magasins
                  {product.stock.ruptures > 0 && `, en rupture dans ${product.stock.ruptures}`}
                  <br />
                  <Link href={`/admin/stocks?q=${product.barCode.toString()}`} className="font-bold text-primary hover:underline">
                    Voir le stock de chaque magasin
                  </Link>
                </span>
              </li>
              {product.stock.lastUpdate && (
                <li className="text-muted-foreground">Stock mis à jour le {formatDate(product.stock.lastUpdate, true)}</li>
              )}
              <li className="text-muted-foreground">Fiche modifiée le {formatDate(product.updatedAt, true)}</li>
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`/product/${product.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-bold transition-colors hover:border-primary hover:text-primary"
              >
                <ExternalLink size={16} aria-hidden /> Voir sur la boutique
              </a>
              <a
                href={`https://fr.openfoodfacts.org/produit/${product.barCode.toString()}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-bold transition-colors hover:border-primary hover:text-primary"
              >
                <ExternalLink size={16} aria-hidden /> Fiche Open Food Facts
              </a>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
