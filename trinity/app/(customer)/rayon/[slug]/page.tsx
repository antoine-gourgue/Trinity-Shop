import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getProductListing } from "@/lib/catalog";
import { parseListingParams } from "@/lib/catalog-options";
import { getRayon, rayonCategoryNames, rayonHref } from "@/lib/rayons";
import ListingHeader from "@/components/catalog/listing-header";
import ProductListing from "@/components/catalog/product-listing";

interface RayonPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: RayonPageProps): Promise<Metadata> {
  const rayon = getRayon((await params).slug);
  if (!rayon) return {};
  return { title: `${rayon.name} — Trinity Shop`, description: rayon.description };
}

export default async function RayonPage({ params, searchParams }: RayonPageProps) {
  const rayon = getRayon((await params).slug);
  if (!rayon) notFound();

  const listingParams = parseListingParams(await searchParams);
  const activeSub = rayon.subcategories.find((s) => s.slug === listingParams.cat);
  const categoryNames = activeSub ? [activeSub.category] : rayonCategoryNames(rayon);

  const [listing, subCounts] = await Promise.all([
    getProductListing({ categories: { some: { categoryName: { in: categoryNames } } } }, {
      ...listingParams,
      cat: activeSub?.slug,
    }),
    prisma.categoriesProducts.groupBy({
      by: ["categoryName"],
      where: { categoryName: { in: rayon.subcategories.map((s) => s.category) } },
      _count: { _all: true },
    }),
  ]);

  const chips = [
    { label: "Tout le rayon", href: rayonHref(rayon), active: !activeSub },
    ...rayon.subcategories.flatMap((s) => {
      const count = subCounts.find((g) => g.categoryName === s.category)?._count._all ?? 0;
      return count > 0
        ? [{ label: s.label, href: rayonHref(rayon, s.slug), active: activeSub?.slug === s.slug, count }]
        : [];
    }),
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <ListingHeader
        title={activeSub?.label ?? rayon.name}
        description={activeSub ? undefined : rayon.description}
        image={rayon.image}
        icon={activeSub?.icon}
        breadcrumb={[
          { label: "Accueil", href: "/" },
          activeSub ? { label: rayon.name, href: rayonHref(rayon) } : { label: rayon.name },
          ...(activeSub ? [{ label: activeSub.label }] : []),
        ]}
        chips={chips}
      />
      <ProductListing
        basePath={`/rayon/${rayon.slug}`}
        params={{ ...listingParams, cat: activeSub?.slug }}
        listing={listing}
      />
    </div>
  );
}
