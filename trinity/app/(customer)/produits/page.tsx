import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { SearchX } from "lucide-react";
import { getProductListing } from "@/lib/catalog";
import { searchProductIds } from "@/lib/search";
import {
  DEFAULT_SORT,
  ListingParams,
  activeFilterCount,
  listingHref,
  parseListingParams,
} from "@/lib/catalog-options";
import { formatBrand } from "@/lib/format";
import ListingHeader from "@/components/catalog/listing-header";
import ProductListing from "@/components/catalog/product-listing";
import RayonTiles from "@/components/catalog/rayon-tiles";

interface ProduitsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const CATALOG_TITLE = "Tous nos produits";

function pageTitle(params: ListingParams) {
  if (params.q) return `Résultats pour « ${params.q} »`;
  if (params.promo && !params.marques.length && !params.nutriscores.length) return "Promotions";
  if (params.categorie) return params.categorie;
  if (params.marques.length === 1 && !params.nutriscores.length) return formatBrand(params.marques[0]);
  if (params.nutriscores.length === 1 && !params.marques.length) return `Nutri-Score ${params.nutriscores[0]}`;
  return CATALOG_TITLE;
}

function pageDescription(params: ListingParams, title: string) {
  if (params.q) return `Résultats de la recherche « ${params.q} » dans le catalogue Trinity Shop.`;
  if (title === CATALOG_TITLE) {
    return "Tout le catalogue Trinity Shop : fruits et légumes, crèmerie, épicerie, boissons… avec le Nutri-Score de chaque produit, en retrait au drive ou en livraison à domicile.";
  }
  return `${title} : faites vos courses en ligne sur Trinity Shop, en retrait au drive ou en livraison à domicile.`;
}

export async function generateMetadata({ searchParams }: ProduitsPageProps): Promise<Metadata> {
  const params = parseListingParams(await searchParams);
  const title = pageTitle(params);
  const metadata: Metadata = { title: `${title} — Trinity Shop`, description: pageDescription(params, title) };

  // Les résultats de recherche ne sont pas indexés ; les liens vers les produits restent suivis
  if (params.q) return { ...metadata, robots: { index: false, follow: true } };
  // Les variantes triées d'une même liste pointent vers la version au tri par défaut
  return {
    ...metadata,
    alternates: { canonical: listingHref("/produits", params, { cat: undefined, tri: DEFAULT_SORT, page: params.page }) },
  };
}

// Recherche texte, pages marque (?marque=u-bio) et catalogue complet
export default async function ProduitsPage({ searchParams }: ProduitsPageProps) {
  const params = parseListingParams(await searchParams);

  // Recherche sans tenir compte des accents, dans le nom, la marque et les catégories
  const ranking = params.q ? await searchProductIds(params.q) : undefined;
  const base: Prisma.ProductWhereInput = {
    AND: [
      ranking ? { id: { in: ranking } } : {},
      params.categorie ? { categories: { some: { categoryName: params.categorie } } } : {},
    ],
  };

  const listing = await getProductListing(base, params, ranking);
  const title = pageTitle(params);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <ListingHeader
        title={title}
        breadcrumb={[{ label: "Accueil", href: "/" }, { label: params.q ? "Recherche" : title }]}
      />
      <ProductListing
        basePath="/produits"
        params={params}
        listing={listing}
        emptyState={
          params.q && listing.total === 0 && activeFilterCount(params) === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed bg-white px-6 py-10">
              <div className="flex flex-col items-center gap-3 text-center">
                <SearchX size={44} className="text-muted-foreground/60" aria-hidden />
                <p className="text-lg font-extrabold">Nous n’avons rien trouvé pour « {params.q} »</p>
                <p className="text-sm text-muted-foreground">
                  Vérifiez l’orthographe, essayez un terme plus général ou parcourez nos rayons.
                </p>
              </div>
              <RayonTiles className="mt-8 lg:grid-cols-5" />
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
