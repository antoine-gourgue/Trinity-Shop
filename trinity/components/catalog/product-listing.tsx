import Link from "next/link";
import { PackageSearch, X } from "lucide-react";
import type { ProductListing as Listing } from "@/lib/catalog";
import {
  ListingParams,
  PAGE_SIZE,
  PRICE_RANGES,
  activeFilterCount,
  listingHref,
} from "@/lib/catalog-options";
import { formatBrand } from "@/lib/format";
import ListingFilters from "@/components/catalog/listing-filters";
import MobileFilters from "@/components/catalog/mobile-filters";
import PaginationNav from "@/components/catalog/pagination-nav";
import ProductGrid from "@/components/catalog/product-grid";
import SortSelect from "@/components/catalog/sort-select";

interface ProductListingProps {
  basePath: string;
  params: ListingParams;
  listing: Listing;
  emptyState?: React.ReactNode;
}

export default function ProductListing({ basePath, params, listing, emptyState }: ProductListingProps) {
  const { products, total, page, pageCount, facets } = listing;
  const filterCount = activeFilterCount(params);
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const filters = <ListingFilters basePath={basePath} params={params} facets={facets} />;

  const activeChips = [
    ...(params.promo ? [{ label: "En promotion", href: listingHref(basePath, params, { promo: false }) }] : []),
    ...params.marques.map((marque) => ({
      label: formatBrand(marque),
      href: listingHref(basePath, params, { marques: params.marques.filter((m) => m !== marque) }),
    })),
    ...params.nutriscores.map((grade) => ({
      label: `Nutri-Score ${grade}`,
      href: listingHref(basePath, params, { nutriscores: params.nutriscores.filter((g) => g !== grade) }),
    })),
    ...(params.prix
      ? [
          {
            label: PRICE_RANGES.find((range) => range.value === params.prix)?.label ?? params.prix,
            href: listingHref(basePath, params, { prix: undefined }),
          },
        ]
      : []),
  ];
  const clearHref = listingHref(basePath, params, { marques: [], nutriscores: [], prix: undefined, promo: false });

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label="Filtres">
        <div className="sticky top-[140px]">{filters}</div>
      </aside>

      <section aria-label="Produits">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? (
              "Aucun produit"
            ) : (
              <>
                <span className="font-bold text-foreground">{total}</span> produit{total > 1 ? "s" : ""}
                {pageCount > 1 && ` · ${first}–${last} affichés`}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <MobileFilters activeCount={filterCount}>{filters}</MobileFilters>
            <SortSelect value={params.tri} search={params.q} />
          </div>
        </div>

        {activeChips.length > 0 && (
          <ul className="mt-3 flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <li key={chip.label}>
                <Link
                  href={chip.href}
                  scroll={false}
                  className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-brand-dark transition-colors hover:bg-primary hover:text-white"
                >
                  {chip.label}
                  <X size={12} aria-label="Retirer ce filtre" />
                </Link>
              </li>
            ))}
            <li>
              <Link href={clearHref} scroll={false} className="text-xs font-bold text-primary underline">
                Tout effacer
              </Link>
            </li>
          </ul>
        )}

        {products.length > 0 ? (
          <>
            <ProductGrid products={products} className="mt-4" />
            <PaginationNav basePath={basePath} params={params} page={page} pageCount={pageCount} />
          </>
        ) : (
          emptyState ?? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
              <PackageSearch size={44} className="text-muted-foreground/60" aria-hidden />
              <p className="text-lg font-extrabold">Aucun produit ne correspond à ces filtres</p>
              <p className="text-sm text-muted-foreground">Essayez d’en retirer un ou deux pour élargir la sélection.</p>
              {filterCount > 0 && (
                <Link
                  href={clearHref}
                  className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-brand-dark"
                >
                  Réinitialiser les filtres
                </Link>
              )}
            </div>
          )
        )}
      </section>
    </div>
  );
}
