import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChevronRight, CreditCard, PackageCheck, Store } from "lucide-react";
import prisma from "@/lib/prisma";
import { getOpenFoodFacts } from "@/lib/server-actions/products-actions";
import { findRayonForCategories, rayonCategoryNames, rayonHref } from "@/lib/rayons";
import { formatBrand, isBioBrand } from "@/lib/format";
import { formatAllergens, formatUnitPrice, nutritionRows } from "@/lib/product-info";
import Price from "@/components/product/price";
import NutriScore from "@/components/product/nutri-score";
import ProductImage from "@/components/product/product-image";
import AddToCartButton from "@/components/product/add-to-cart-button";
import ProductSection from "@/components/catalog/product-section";

interface ProductPageProps {
  params: Promise<{ productId: string }>;
}

const getProduct = cache((id: string) =>
  prisma.product.findUnique({
    where: { id },
    include: {
      brand: true,
      stock: { select: { quantity: true } },
      categories: { select: { categoryName: true } },
    },
  })
);

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProduct((await params).productId);
  if (!product) return {};
  return { title: `${product.name} — Trinity Shop` };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct((await params).productId);
  if (!product) notFound();

  const match = findRayonForCategories(product.categories.map((c) => c.categoryName));
  const similarCategories = match
    ? match.subCategory
      ? [match.subCategory.category]
      : rayonCategoryNames(match.rayon)
    : product.categories.map((c) => c.categoryName);

  const [{ openFoodData: off }, similar] = await Promise.all([
    getOpenFoodFacts(product.barCode.toString()),
    prisma.product.findMany({
      where: {
        id: { not: product.id },
        categories: { some: { categoryName: { in: similarCategories } } },
      },
      include: { brand: true },
      orderBy: { name: "asc" },
      take: 10,
    }),
  ]);

  const quantity: string | undefined = off?.quantity || undefined;
  const unitPrice = formatUnitPrice(product.price, quantity);
  const stock = product.stock?.quantity ?? 0;
  const allergens = formatAllergens(off?.allergens_tags);
  const nutrition = nutritionRows(off?.nutriments);
  const ingredients: string | undefined = off?.ingredients_text_fr || off?.ingredients_text || undefined;
  const description: string | undefined = off?.generic_name_fr || off?.generic_name || undefined;
  const conservation: string | undefined = off?.conservation_conditions_fr || off?.conservation_conditions || undefined;
  const brandLabel = formatBrand(product.brand?.name);

  const facts = [
    quantity && { label: "Contenance", value: quantity },
    off?.origins && { label: "Origine", value: off.origins as string },
    off?.manufacturing_places && { label: "Lieu de fabrication", value: off.manufacturing_places as string },
    { label: "Code-barres", value: product.barCode.toString() },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <nav aria-label="Fil d'Ariane">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary hover:underline">Accueil</Link>
          </li>
          {match && (
            <li className="flex items-center gap-1">
              <ChevronRight size={12} aria-hidden />
              <Link href={rayonHref(match.rayon)} className="hover:text-primary hover:underline">
                {match.rayon.name}
              </Link>
            </li>
          )}
          {match?.subCategory && (
            <li className="flex items-center gap-1">
              <ChevronRight size={12} aria-hidden />
              <Link
                href={rayonHref(match.rayon, match.subCategory.slug)}
                className="hover:text-primary hover:underline"
              >
                {match.subCategory.label}
              </Link>
            </li>
          )}
          <li className="flex min-w-0 items-center gap-1">
            <ChevronRight size={12} aria-hidden />
            <span aria-current="page" className="truncate font-semibold text-foreground">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-8 rounded-3xl border bg-white p-5 md:grid-cols-2 md:p-8">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
            <ProductImage
              src={product.picture}
              alt={product.name}
              sizes="(min-width: 1024px) 420px, 90vw"
              priority
              className="p-4"
            />
            {isBioBrand(product.brand?.name) && (
              <span className="absolute left-0 top-0 rounded-lg bg-bio px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                Bio
              </span>
            )}
          </div>

          <div className="flex flex-col">
            {brandLabel && (
              <Link
                href={`/produits?marque=${encodeURIComponent(product.brand.name)}`}
                className="w-fit text-xs font-extrabold uppercase tracking-wide text-primary hover:underline"
              >
                {brandLabel}
              </Link>
            )}
            <h1 className="mt-1 text-2xl font-black leading-tight md:text-3xl">{product.name}</h1>
            {quantity && <p className="mt-1 text-sm text-muted-foreground">{quantity}</p>}

            <NutriScore grade={product.nutriScore} className="mt-5 h-14" />

            <dl className="mt-6 divide-y rounded-2xl bg-muted/60 text-sm">
              {facts.map((fact) => (
                <div key={fact.label} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted-foreground">{fact.label}</dt>
                  <dd className="text-right font-semibold">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <aside className="rounded-3xl border bg-white p-6 lg:sticky lg:top-[140px]">
          <Price value={product.price} size="lg" />
          {unitPrice && <p className="mt-1 text-sm text-muted-foreground">soit {unitPrice}</p>}

          <p className="mt-4 flex items-center gap-2 text-sm font-bold">
            <span
              aria-hidden
              className={`h-2.5 w-2.5 rounded-full ${stock > 10 ? "bg-bio" : stock > 0 ? "bg-highlight" : "bg-promo"}`}
            />
            {stock > 10 ? "En stock" : stock > 0 ? `Plus que ${stock} en stock` : "Rupture de stock"}
          </p>

          <AddToCartButton
            productId={product.id}
            productName={product.name}
            size="lg"
            disabled={stock === 0}
            className="mt-5 w-full"
          />

          <ul className="mt-6 space-y-3 border-t pt-5 text-sm">
            <li className="flex items-center gap-3">
              <Store size={18} className="shrink-0 text-primary" aria-hidden />
              Retrait au drive Trinity U Rennes Epitech
            </li>
            <li className="flex items-center gap-3">
              <PackageCheck size={18} className="shrink-0 text-primary" aria-hidden />
              Préparé avec soin par nos équipes
            </li>
            <li className="flex items-center gap-3">
              <CreditCard size={18} className="shrink-0 text-primary" aria-hidden />
              Paiement sécurisé
            </li>
          </ul>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <InfoCard title="Description">
          <p>{description ?? "Aucune description disponible pour ce produit."}</p>
          {conservation && (
            <>
              <h3 className="mt-4 font-extrabold">Conservation</h3>
              <p className="mt-1">{conservation}</p>
            </>
          )}
        </InfoCard>

        <InfoCard title="Valeurs nutritionnelles" className="lg:row-span-2">
          {nutrition.length > 0 ? (
            <table className="w-full text-sm">
              <caption className="sr-only">Valeurs nutritionnelles pour 100 g</caption>
              <thead>
                <tr className="border-b-2 border-foreground/80 text-left">
                  <th scope="col" className="py-2 font-extrabold">Pour 100 g</th>
                  <th scope="col" className="py-2 text-right font-extrabold">Valeur</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {nutrition.map((row) => (
                  <tr key={`${row.label}-${row.value}`}>
                    <th scope="row" className={`py-2 text-left font-semibold ${row.indent ? "pl-4 font-normal text-muted-foreground" : ""}`}>
                      {row.label}
                    </th>
                    <td className="py-2 text-right tabular-nums">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Valeurs nutritionnelles non renseignées.</p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Informations issues d’OpenFoodFacts, données collaboratives sous licence ODbL.
          </p>
        </InfoCard>
        <InfoCard title="Ingrédients et allergènes">
          <p>{ingredients ?? "Liste des ingrédients non renseignée."}</p>
          {allergens.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="font-extrabold">Allergènes :</span>
              {allergens.map((allergen) => (
                <span key={allergen} className="rounded-full bg-promo/10 px-3 py-1 text-xs font-bold text-promo">
                  {allergen}
                </span>
              ))}
            </div>
          )}
        </InfoCard>

      </div>

      <ProductSection
        title={match?.subCategory ? `Dans le rayon ${match.subCategory.label}` : "Vous aimerez aussi"}
        href={match ? rayonHref(match.rayon, match.subCategory?.slug) : undefined}
        products={similar}
      />
    </div>
  );
}

function InfoCard({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-3xl border bg-white p-6 text-sm leading-relaxed md:p-8 ${className ?? ""}`}>
      <h2 className="mb-3 text-lg font-black">{title}</h2>
      {children}
    </section>
  );
}
