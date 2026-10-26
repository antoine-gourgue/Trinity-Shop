import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { SearchX } from "lucide-react";
import { getProductListing } from "@/lib/catalog";
import { ListingParams, activeFilterCount, parseListingParams } from "@/lib/catalog-options";
import { formatBrand } from "@/lib/format";
import ListingHeader from "@/components/catalog/listing-header";
import ProductListing from "@/components/catalog/product-listing";
import RayonTiles from "@/components/catalog/rayon-tiles";

interface ProduitsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pageTitle(params: ListingParams) {
  if (params.q) return `Résultats pour « ${params.q} »`;
  if (params.promo && !params.marques.length && !params.nutriscores.length) return "Promotions";
  if (params.categorie) return params.categorie;
  if (params.marques.length === 1 && !params.nutriscores.length) return formatBrand(params.marques[0]);
  if (params.nutriscores.length === 1 && !params.marques.length) return `Nutri-Score ${params.nutriscores[0]}`;
  return "Tous nos produits";
}

export async function generateMetadata({ searchParams }: ProduitsPageProps): Promise<Metadata> {
  return { title: `${pageTitle(parseListingParams(await searchParams))} — Trinity Shop` };
}

// Recherche texte, pages marque (?marque=u-bio) et catalogue complet
export default async function ProduitsPage({ searchParams }: ProduitsPageProps) {
  const params = parseListingParams(await searchParams);

  const base: Prisma.ProductWhereInput = {
    AND: [
      params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { brand: { name: { contains: params.q.replace(/\s+/g, "-"), mode: "insensitive" } } },
            ],
          }
        : {},
      params.categorie ? { categories: { some: { categoryName: params.categorie } } } : {},
    ],
  };

  const listing = await getProductListing(base, params);
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
