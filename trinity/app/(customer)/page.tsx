import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CreditCard, ShoppingBasket, Store } from "lucide-react";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { currentStore } from "@/lib/current-store";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import RayonTiles from "@/components/catalog/rayon-tiles";
import ProductSection from "@/components/catalog/product-section";
import ProductCarousel from "@/components/catalog/product-carousel";
import OperationBanners, { type OperationBanner } from "@/components/catalog/operation-banners";
import Prospectus, { type ProspectusItem } from "@/components/catalog/prospectus";
import AntiGaspiCard from "@/components/anti-gaspi/anti-gaspi-card";
import { storeOffers } from "@/lib/anti-gaspi-offers";
import { discountPercent, formatPrice } from "@/lib/format";
import { pickupDays, pickupHours } from "@/lib/checkout";
import { FREE_DELIVERY_FROM } from "@/lib/delivery";
import { POINTS_PER_VOUCHER, VOUCHER_VALUE } from "@/lib/loyalty";
import { applyStorePromotion, storePromotions } from "@/lib/store-prices";
import { runningProspectus } from "@/lib/prospectus";
import { formatProspectusDates, formatProspectusLastDay, prospectusBanner } from "@/lib/prospectus-rules";

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
    text: "Au drive de votre magasin Trinity, ou livrées chez vous.",
  },
];

// Derniers favoris du client connecté, pour les racheter sans chercher
async function favoriteProducts(userId: string | undefined) {
  if (!userId) return [];
  const favorites = await prisma.favorite.findMany({
    where: { userId, product: VISIBLE_PRODUCT },
    orderBy: { createdAt: "desc" },
    take: SECTION_SIZE,
    select: { product: { include: { brand: true } } },
  });
  return favorites.map((favorite) => favorite.product);
}

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

  const [session, store] = await Promise.all([auth(), currentStore()]);
  // Une seule vague de requêtes : les prix des prospectus du magasin sont lus une fois, puis appliqués
  // en mémoire à chaque section (le changement de magasin attend ce rendu)
  const [storeCount, favorites, saveurs, nutriA, bio, matLou, promoPrices, promotions, storeProspectus, antiGaspiOffers] = await Promise.all([
    prisma.store.count(),
    favoriteProducts(session?.user?.id),
    productsWhere({ brand: { name: "u-saveurs" } }),
    productsWhere({ nutriScore: "A" }),
    productsWhere({ brand: { name: "u-bio" } }),
    productsWhere({ brand: { name: "u-mat-lou" } }),
    // Promotions en cours, pour la bannière Promos et le prospectus
    prisma.product.findMany({
      where: { ...VISIBLE_PRODUCT, regularPrice: { not: null } },
      select: { id: true, name: true, picture: true, price: true, regularPrice: true, netContent: true, promoEndsAt: true },
    }),
    storePromotions(store?.id),
    store ? runningProspectus(store.id) : null,
    // Dates courtes du magasin choisi, à prix réduit
    store ? storeOffers(store.id) : [],
  ]);
  // Prix du magasin du client dans les sections de produits (prospectus en cours)
  const atStorePrice = <T extends { id: string; price: number; regularPrice: number | null; promoEndsAt: Date | null }>(products: T[]) =>
    products.map((product) => applyStorePromotion(product, promotions.get(product.id)));
  const [favoriteList, saveursList, nutriAList, bioList, matLouList] = [favorites, saveurs, nutriA, bio, matLou].map(atStorePrice);
  // Promotions nationales, les plus fortes remises d'abord : les trois premières sur la bannière, les
  // suivantes au prospectus (quand le magasin n'a pas le sien)
  const topPromos: ProspectusItem[] = promoPrices
    .map((product) => ({ ...product, regularPrice: product.regularPrice ?? product.price, percent: discountPercent(product.price, product.regularPrice) ?? 0 }))
    .sort((a, b) => b.percent - a.percent);
  const antiGaspi = antiGaspiOffers.slice(0, SECTION_SIZE);
  const topAntiGaspi = [...antiGaspiOffers].sort((a, b) => b.percent - a.percent);
  // Premier retrait possible : le prochain jour d'ouverture, au premier créneau
  const firstPickup = new Date(`${pickupDays()[0].date}T12:00:00`);
  const firstHour = pickupHours()[0];
  const pickupWeekday = firstPickup.toLocaleDateString("fr-FR", { weekday: "long" });
  const freeDelivery = formatPrice(FREE_DELIVERY_FROM).replace(",00", "");

  const banners: OperationBanner[] = [
    // Le prospectus du magasin en tête, puis les promotions nationales
    ...(storeProspectus ? [prospectusBanner(storeProspectus, storeProspectus.offers)] : []),
    {
      href: "/produits?promo=1",
      tone: "promo",
      kicker: "Promos de la semaine",
      title: `Jusqu'à −${topPromos[0]?.percent ?? 0}\u00a0%`,
      text: `Sur ${promoPrices.length} produits en promotion`,
      cta: "J'en profite",
      visual: { kind: "products", products: topPromos.slice(0, 3) },
    },
    {
      href: "/anti-gaspi",
      tone: "bio",
      kicker: store ? `Anti-gaspi · ${store.name}` : "Anti-gaspi",
      title: `Jusqu'à −${topAntiGaspi[0]?.percent ?? 50}\u00a0%`,
      text: !store
        ? "Choisissez votre magasin pour voir ses dates courtes"
        : antiGaspiOffers.length > 0
          ? `${antiGaspiOffers.length} dates courtes dans votre magasin`
          : "Pas de date courte dans votre magasin pour le moment",
      cta: "Voir les offres",
      visual: { kind: "products", products: topAntiGaspi.slice(0, 3).map((offer) => offer.product) },
    },
    {
      href: "#rayons",
      tone: "brand",
      kicker: store ? `Drive ${store.name}` : "Drive Trinity",
      title: "Retrait gratuit",
      text: `${store ? store.hours : `${storeCount} magasins en France`} · Livraison offerte dès ${freeDelivery}`,
      cta: "Faire mes courses",
      visual: {
        kind: "pickup",
        weekday: pickupWeekday,
        date: firstPickup.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
        hour: `${firstHour}h – ${firstHour + 1}h`,
      },
    },
    {
      href: "/legal/loyalty-program",
      tone: "highlight",
      kicker: "Carte Trinity",
      title: `${formatPrice(VOUCHER_VALUE).replace(",00", "")} offerts`,
      text: `Tous les ${POINTS_PER_VOUCHER} points cumulés, à raison d'un point par euro`,
      cta: "Découvrir",
      visual: { kind: "card" },
    },
  ];

  // Promotions nationales : toujours présentes, après le prospectus du magasin s'il en a un
  const nationalPromotions = (
    <Prospectus
      id="promos-nationales"
      label="Promos de la semaine"
      tag={`${promoPrices.length} produits en promo`}
      headline={
        <>
          Les prix
          <br />
          qui comptent
          <br />
          <span className="text-promo">cette semaine</span>
        </>
      }
      description={`${promoPrices.length} produits en promotion dans tous les magasins Trinity, à retirer dès ${pickupWeekday} au drive ou à vous faire livrer.`}
      href="/produits?promo=1"
      cta="Toutes les promos"
      items={topPromos.slice(3, 8)}
    />
  );
  const storePromotionsBlock = storeProspectus && store && (
    <Prospectus
      id="prospectus-magasin"
      label="Prospectus de votre magasin"
      tag={formatProspectusDates(storeProspectus)}
      headline={
        <>
          {storeProspectus.title}
          <br />
          <span className="text-promo">à {store.city}</span>
        </>
      }
      description={`${storeProspectus.offers.length} produit${storeProspectus.offers.length > 1 ? "s" : ""} à prix promo dans votre magasin, jusqu'au ${formatProspectusLastDay(storeProspectus.endsAt)}.`}
      href={`/prospectus/${storeProspectus.id}`}
      cta="Tout le prospectus"
      // Sans reprendre les produits de la bannière quand le prospectus en a assez
      items={storeProspectus.offers.length >= 8 ? storeProspectus.offers.slice(3, 8) : storeProspectus.offers.slice(0, 5)}
    />
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <h1 className="sr-only">{store ? `Vos courses au drive ${store.name}` : "Vos courses en ligne, prêtes au drive"}</h1>
      <OperationBanners banners={banners} />

      <ProductSection
        title="Vos favoris"
        subtitle="Vos produits habituels, à remettre au panier en un clic."
        href="/user/favoris"
        products={favoriteList}
      />

      {storeProspectus ? storePromotionsBlock : nationalPromotions}

      {antiGaspi.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black md:text-2xl">Anti-gaspi dans votre magasin</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Des dates courtes jusqu’à −50 %, trop bonnes pour être jetées.</p>
            </div>
            <Link href="/anti-gaspi" className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary hover:underline">
              Voir tout <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <ProductCarousel label="Anti-gaspi">
            {antiGaspi.map((offer) => (
              <li key={offer.lotId} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%] xl:w-[19%]">
                <AntiGaspiCard offer={offer} />
              </li>
            ))}
          </ProductCarousel>
        </section>
      )}

      {storeProspectus && nationalPromotions}

      <section id="rayons" className="mt-10 scroll-mt-40">
        <h2 className="mb-4 text-xl font-black md:text-2xl">Nos rayons</h2>
        <RayonTiles />
      </section>

      <ProductSection
        title="U Saveurs, le goût des régions"
        subtitle="Des recettes de terroir sélectionnées par nos équipes."
        href="/produits?marque=u-saveurs"
        products={saveursList}
      />
      <ProductSection
        title="Les champions du Nutri-Score"
        subtitle="Des produits notés A pour composer des repas équilibrés."
        href="/produits?nutriscore=A"
        products={nutriAList}
      />
      <ProductSection
        title="Le bio U"
        subtitle="Issus de l’agriculture biologique."
        href="/produits?marque=u-bio"
        products={bioList}
      />
      <ProductSection
        title="Pour les petits : U Mat&Lou"
        subtitle="Goûters, compotes et repas pensés pour les enfants."
        href="/produits?marque=u-mat-lou"
        products={matLouList}
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
