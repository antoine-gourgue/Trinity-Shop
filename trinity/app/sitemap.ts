import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import { productPath } from "@/lib/product-seo";
import { RAYONS, rayonHref } from "@/lib/rayons";
import { absoluteUrl } from "@/lib/site-url";

// Généré à la demande plutôt qu'au build, où la base n'est pas toujours joignable ;
// la liste des produits, seule partie coûteuse, est mise en cache 24 h ci-dessous
export const dynamic = "force-dynamic";

const LEGAL_PAGES = ["faq", "contact", "loyalty-program", "mention-legal", "privacy-policy", "cookie"];

const getVisibleProducts = unstable_cache(
  async () => {
    const products = await prisma.product.findMany({
      where: VISIBLE_PRODUCT,
      select: { id: true, updatedAt: true },
      orderBy: { id: "asc" },
    });
    // Le cache est sérialisé en JSON : les dates y sont conservées sous forme de texte ISO
    return products.map((product) => ({ id: product.id, updatedAt: product.updatedAt.toISOString() }));
  },
  ["sitemap-visible-products"],
  { revalidate: 86400 }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getVisibleProducts();

  return [
    { url: absoluteUrl("/") },
    { url: absoluteUrl("/produits") },
    ...RAYONS.map((rayon) => ({ url: absoluteUrl(rayonHref(rayon)) })),
    ...products.map((product) => ({
      url: absoluteUrl(productPath(product.id)),
      lastModified: product.updatedAt,
    })),
    ...LEGAL_PAGES.map((page) => ({ url: absoluteUrl(`/legal/${page}`) })),
  ];
}
