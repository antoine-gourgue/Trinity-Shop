import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CreditCard, Leaf, MapPin, ShoppingBasket, Sparkles, Store } from "lucide-react";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import RayonTiles from "@/components/catalog/rayon-tiles";
import ProductSection from "@/components/catalog/product-section";

// Titre et description viennent du layout racine ; l'URL canonique écarte les paramètres ajoutés (?utm_…)
export const metadata: Metadata = { alternates: { canonical: "/" } };

const SECTION_SIZE = 10;

const STEPS = [
  {
    icon: ShoppingBasket,
    title: "Je remplis mon panier",
    text: "Parcourez les rayons, cherchez un produit ou scannez son code-barres.",
  },
  {
    icon: CreditCard,
    title: "Je valide ma commande",
    text: "Paiement en ligne en quelques secondes (simulé sur cette démo).",
  },
  {
    icon: Store,
    title: "Je récupère mes courses",
    text: "Au drive Trinity U Rennes Epitech, ou livrées chez vous.",
  },
];

function productsWhere(where: Prisma.ProductWhereInput) {
  return prisma.product.findMany({
    where: { AND: [where, VISIBLE_PRODUCT] },
    include: { brand: true },
    orderBy: { name: "asc" },
    take: SECTION_SIZE,
  });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  // Ancienne URL de recherche (/?product=…)
  const legacyQuery = (await searchParams).product;
  if (legacyQuery) redirect(`/produits?q=${encodeURIComponent(legacyQuery)}`);

  const [productCount, bioCount, nutriACount, promos, saveurs, nutriA, bio, matLou] = await Promise.all([
    prisma.product.count({ where: VISIBLE_PRODUCT }),
    prisma.product.count({ where: { ...VISIBLE_PRODUCT, brand: { name: "u-bio" } } }),
    prisma.product.count({ where: { ...VISIBLE_PRODUCT, nutriScore: "A" } }),
    productsWhere({ regularPrice: { not: null } }),
    productsWhere({ brand: { name: "u-saveurs" } }),
    productsWhere({ nutriScore: "A" }),
    productsWhere({ brand: { name: "u-bio" } }),
    productsWhere({ brand: { name: "u-mat-lou" } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-brand-dark px-6 py-8 text-white sm:px-10 sm:py-12 lg:col-span-2">
          <Image
            src="/assets/fruits.png"
            alt=""
            width={420}
            height={420}
            priority
            className="pointer-events-none absolute -right-20 top-1/2 hidden w-[380px] -translate-y-1/2 rotate-12 sm:block"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-brand-dark from-45% via-brand-dark/85 to-transparent sm:block"
          />
          <div className="relative max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <MapPin size={14} className="text-highlight" aria-hidden />
              Trinity U Rennes Epitech
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              Vos courses du quotidien, <span className="text-highlight">prêtes au drive</span>
            </h1>
            <p className="mt-3 text-white/80">
              Plus de {Math.floor(productCount / 100) * 100} produits U, des fruits et légumes à
              l’épicerie : commandez en ligne et récupérez vos courses en magasin.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#rayons"
                className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-brand-dark transition-colors hover:bg-highlight"
              >
                Découvrir les rayons <ArrowRight size={16} aria-hidden />
              </Link>
              <Link
                href="/produits?promo=1"
                className="rounded-full border border-white/40 px-5 py-3 text-sm font-bold transition-colors hover:bg-white/10"
              >
                Voir les promos
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            href="/produits?marque=u-bio"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-bio p-6 text-white"
          >
            <Leaf size={96} className="absolute -bottom-4 -right-4 rotate-12 text-white/15" aria-hidden />
            <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              U Bio
            </span>
            <div className="mt-6">
              <p className="text-2xl font-black">Le bio au quotidien</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-white/85">
                {bioCount} produits bio <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </p>
            </div>
          </Link>
          <Link
            href="/produits?nutriscore=A"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-highlight p-6 text-brand-dark"
          >
            <Sparkles size={96} className="absolute -bottom-4 -right-4 text-brand-dark/10" aria-hidden />
            <span className="w-fit rounded-full bg-brand-dark/10 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              Nutri-Score A
            </span>
            <div className="mt-6">
              <p className="text-2xl font-black">Mangez équilibré</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-bold">
                {nutriACount} produits bien notés <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section id="rayons" className="mt-10 scroll-mt-40">
        <h2 className="mb-4 text-xl font-black md:text-2xl">Nos rayons</h2>
        <RayonTiles />
      </section>

      <ProductSection
        title="Les promos du moment"
        subtitle="Des remises sur une sélection de produits de tous les rayons."
        href="/produits?promo=1"
        products={promos}
      />
      <ProductSection
        title="U Saveurs, le goût des régions"
        subtitle="Des recettes de terroir sélectionnées par nos équipes."
        href="/produits?marque=u-saveurs"
        products={saveurs}
      />
      <ProductSection
        title="Les champions du Nutri-Score"
        subtitle="Des produits notés A pour composer des repas équilibrés."
        href="/produits?nutriscore=A"
        products={nutriA}
      />
      <ProductSection
        title="Le bio U"
        subtitle="Issus de l’agriculture biologique."
        href="/produits?marque=u-bio"
        products={bio}
      />
      <ProductSection
        title="Pour les petits : U Mat&Lou"
        subtitle="Goûters, compotes et repas pensés pour les enfants."
        href="/produits?marque=u-mat-lou"
        products={matLou}
      />

      <section className="mt-14 rounded-3xl bg-white p-6 ring-1 ring-border md:p-10">
        <h2 className="text-center text-xl font-black md:text-2xl">Comment ça marche ?</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="flex flex-col items-center text-center">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
                <Icon size={28} aria-hidden />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                  {index + 1}
                </span>
              </span>
              <p className="mt-4 font-extrabold">{title}</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
