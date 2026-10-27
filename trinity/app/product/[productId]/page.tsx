import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChevronDown, ChevronRight, CreditCard, PackageCheck, Store } from "lucide-react";
import prisma from "@/lib/prisma";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import { getOpenFoodFacts } from "@/lib/server-actions/products-actions";
import { findRayonForCategories, rayonCategoryNames, rayonHref } from "@/lib/rayons";
import { discountPercent, formatBrand, formatPrice, isBioBrand } from "@/lib/format";
import { formatAllergens, formatUnitPrice, ingredientParts, nutritionRows } from "@/lib/product-info";
import { productDescription, productJsonLd, productPath, serializeJsonLd } from "@/lib/product-seo";
import PriceBlock from "@/components/product/price-block";
import { formatPromoEnd } from "@/lib/promotions";
import { currentStore } from "@/lib/current-store";
import NutriScore from "@/components/product/nutri-score";
import ProductImage from "@/components/product/product-image";
import AddToCartButton from "@/components/product/add-to-cart-button";
import FavoriteButton from "@/components/product/favorite-button";
import ProductCarousel from "@/components/catalog/product-carousel";
import ProductCard from "@/components/product/productCard";
import NutritionTable from "@/components/product/nutrition-table";
import ProductStickyBar from "@/components/product/product-sticky-bar";

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

  const title = `${product.name} — Trinity Shop`;
  const description = productDescription(product);
  const url = productPath(product.id);
  // Sans photo, on garde l'image de partage du site (openGraph remplace entièrement celui du layout)
  const images = product.picture ? [{ url: product.picture, alt: product.name }] : [{ url: "/og.png", alt: "Trinity Shop" }];

  return {
    title,
    description,
    alternates: { canonical: url },
    // Produit retiré du catalogue : la fiche reste accessible depuis les commandes mais n'est pas indexée
    ...(product.hidden ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: "website", siteName: "Trinity Shop", locale: "fr_FR", url, title, description, images },
    twitter: { card: "summary", title, description, images },
  };
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

  const [{ openFoodData: off }, similar, store] = await Promise.all([
    getOpenFoodFacts(product.barCode.toString()),
    prisma.product.findMany({
      where: {
        ...VISIBLE_PRODUCT,
        id: { not: product.id },
        categories: { some: { categoryName: { in: similarCategories } } },
      },
      include: { brand: true },
      orderBy: { name: "asc" },
      take: 10,
    }),
    currentStore(),
  ]);

  const quantity: string | undefined = product.netContent || off?.quantity || undefined;
  const discount = discountPercent(product.price, product.regularPrice);
  const stock = product.stock?.quantity ?? 0;
  const allergens = formatAllergens(off?.allergens_tags);
  const nutrition = nutritionRows(off?.nutriments);
  const ingredients: string | undefined = off?.ingredients_text_fr || off?.ingredients_text || undefined;
  const description: string | undefined = off?.generic_name_fr || off?.generic_name || undefined;
  const conservation: string | undefined = off?.conservation_conditions_fr || off?.conservation_conditions || undefined;
  const manufacturingPlaces: string | undefined = off?.manufacturing_places || undefined;
  const brandLabel = formatBrand(product.brand?.name);

  const facts = [
    quantity && { label: "Contenance", value: quantity },
    { label: "Code-barres", value: product.barCode.toString() },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd(product, { description })) }}
      />
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
          <li className="hidden min-w-0 items-center gap-1 sm:flex">
            <ChevronRight size={12} aria-hidden />
            <span aria-current="page" className="truncate font-semibold text-foreground">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        {/* Sur mobile la carte s'efface : image, titre, achat puis détails s'enchaînent (voir les order-*) */}
        <div className="contents md:grid md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-8 md:gap-y-6 md:rounded-3xl md:border md:bg-white md:p-8">
          <div className="relative order-1 aspect-[4/3] overflow-hidden rounded-3xl border bg-white sm:aspect-[16/10] md:row-span-2 md:aspect-square md:rounded-2xl md:border-0">
            <ProductImage
              src={product.picture}
              alt={product.name}
              sizes="(min-width: 1024px) 420px, (min-width: 768px) 45vw, 90vw"
              priority
              className="p-4"
            />
            {isBioBrand(product.brand?.name) && (
              <span className="absolute left-0 top-0 rounded-lg bg-bio px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                Bio
              </span>
            )}
            {discount && (
              <span className="absolute right-0 top-0 rounded-lg bg-promo px-3 py-1 text-sm font-black text-white">
                -{discount} %
              </span>
            )}
            <FavoriteButton productId={product.id} className="absolute bottom-3 right-3 h-11 w-11" />
          </div>

          <div className="order-2 px-1 md:px-0">
            {brandLabel && (
              <Link
                href={`/produits?marque=${encodeURIComponent(product.brand.name)}`}
                className="w-fit text-xs font-extrabold uppercase tracking-wide text-primary hover:underline"
              >
                {brandLabel}
              </Link>
            )}
            <h1 className="mt-1 text-xl font-black leading-tight sm:text-2xl md:text-3xl">{product.name}</h1>
            {quantity && <p className="mt-1 text-sm text-muted-foreground">{quantity}</p>}
          </div>

          <div className="order-4 rounded-3xl border bg-white p-5 md:rounded-none md:border-0 md:bg-transparent md:p-0">
            <NutriScore grade={product.nutriScore} className="h-12 md:h-14" />

            <dl className="mt-5 divide-y rounded-2xl bg-muted/60 text-sm md:mt-6">
              {facts.map((fact) => (
                <div key={fact.label} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted-foreground">{fact.label}</dt>
                  <dd className="text-right font-semibold">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <aside id="achat" className="order-3 rounded-3xl border bg-white p-5 md:p-6">
          {discount && product.regularPrice && (
            <p className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-promo px-2 py-0.5 text-sm font-black text-white">-{discount} %</span>
              <span className="text-sm font-bold text-promo">
                Vous économisez {formatPrice(product.regularPrice - product.price)}
              </span>
              {product.promoEndsAt && (
                <span className="w-full text-xs text-muted-foreground">Offre valable jusqu’au {formatPromoEnd(product.promoEndsAt)}</span>
              )}
            </p>
          )}
          <PriceBlock price={product.price} regularPrice={product.regularPrice} netContent={quantity} size="lg" />

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
              {store ? `Retrait au drive ${store.name}` : "Retrait au drive de votre magasin Trinity"}
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

      <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-8">
          <InfoSection id="description" title="Description">
            <p>{description ?? "Aucune description disponible pour ce produit."}</p>
            {brandLabel && (
              <p className="mt-3">
                <span className="font-bold">Marque :</span> {brandLabel}
              </p>
            )}
          </InfoSection>

          <InfoSection id="composition" title="Composition et origine">
            <h3 className="text-lg font-black">Ingrédients</h3>
            <p className="mt-2">
              {ingredients ? (
                <>
                  Ingrédients :{" "}
                  {ingredientParts(ingredients).map((part, index) =>
                    part.allergen ? <strong key={index}>{part.text}</strong> : part.text
                  )}
                </>
              ) : (
                "Liste des ingrédients non renseignée."
              )}
            </p>
            {allergens.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-bold">Allergènes :</span>
                {allergens.map((allergen) => (
                  <span key={allergen} className="rounded-full bg-promo/10 px-3 py-1 text-xs font-bold text-promo">
                    {allergen}
                  </span>
                ))}
              </div>
            )}

            {off?.origins && (
              <>
                <h3 className="mt-8 text-lg font-black">Origine</h3>
                <p className="mt-2">{off.origins}</p>
              </>
            )}

            <h3 className="mt-8 text-lg font-black">Informations nutritionnelles</h3>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <NutriScore grade={product.nutriScore} className="h-14" />
              <p className="min-w-[200px] flex-1">
                Le Nutri-Score est un logo qui informe sur la qualité nutritionnelle d’un produit.
              </p>
              <a
                href="https://www.santepubliquefrance.fr/determinants-de-sante/nutrition-et-activite-physique/articles/nutri-score"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline underline-offset-4 hover:text-brand-dark"
              >
                En savoir plus
              </a>
            </div>

            <h3 id="nutrition" className="mt-8 scroll-mt-[230px] text-lg font-black">
              Valeurs nutritionnelles
            </h3>
            <div className="mt-4">
              {nutrition.length > 0 ? <NutritionTable rows={nutrition} /> : <p>Valeurs nutritionnelles non renseignées.</p>}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Informations issues d’OpenFoodFacts, données collaboratives sous licence ODbL.
            </p>
          </InfoSection>

          {(conservation || manufacturingPlaces) && (
            <InfoSection id="conseils" title="Conseils">
              {conservation && (
                <>
                  <h3 className="text-lg font-black">Conservation</h3>
                  <p className="mt-2">{conservation}</p>
                </>
              )}
              {manufacturingPlaces && (
                <>
                  <h3 className={`text-lg font-black ${conservation ? "mt-8" : ""}`}>Lieu de fabrication</h3>
                  <p className="mt-2">{manufacturingPlaces}</p>
                </>
              )}
            </InfoSection>
          )}
        </div>

        {similar.length > 0 && (
          <aside id="similaires" className="mt-4 scroll-mt-[230px] lg:sticky lg:top-[240px] lg:mt-12">
            <div className="relative rounded-3xl bg-brand-dark px-4 pb-6 pt-12 md:px-6">
              <p className="absolute -top-4 left-5 -rotate-2 rounded-lg bg-highlight px-4 py-2 font-black text-brand-dark shadow-md">
                Vous aimerez aussi :
              </p>
              <ProductCarousel label="Vous aimerez aussi">
                {similar.map((item) => (
                  <li key={item.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[85%]">
                    <ProductCard
                      id={item.id}
                      name={item.name}
                      price={item.price}
                      regularPrice={item.regularPrice}
                      netContent={item.netContent}
                      picture={item.picture}
                      nutriScore={item.nutriScore ?? undefined}
                      brand={item.brand?.name}
                    />
                  </li>
                ))}
              </ProductCarousel>
              {match && (
                <Link
                  href={rayonHref(match.rayon, match.subCategory?.slug)}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-white hover:underline"
                >
                  Tout le rayon {match.subCategory?.label ?? match.rayon.name} <ChevronRight size={16} aria-hidden />
                </Link>
              )}
            </div>
          </aside>
        )}
      </div>

      <ProductStickyBar
        productId={product.id}
        name={product.name}
        picture={product.picture}
        price={product.price}
        regularPrice={product.regularPrice}
        unitPrice={formatUnitPrice(product.price, quantity)}
        disabled={stock === 0}
        triggerId="achat"
        sections={[
          { id: "description", label: "Description" },
          { id: "composition", label: "Composition & origine" },
          ...(conservation || manufacturingPlaces ? [{ id: "conseils", label: "Conseils" }] : []),
          ...(similar.length > 0 ? [{ id: "similaires", label: "Vous aimerez aussi", track: false }] : []),
        ]}
      />
    </div>
  );
}

function InfoSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[230px]">
      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1 text-xl font-black md:text-2xl [&::-webkit-details-marker]:hidden">
          {title}
          <ChevronDown size={24} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-3 rounded-3xl bg-white p-5 text-[15px] leading-relaxed shadow-sm md:mt-4 md:p-10">{children}</div>
      </details>
    </section>
  );
}
