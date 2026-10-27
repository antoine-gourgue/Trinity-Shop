import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import ProductCard from "@/components/product/productCard";
import StoreButton from "@/components/store/store-button";
import { currentStore } from "@/lib/current-store";
import { displayFont } from "@/lib/fonts";
import { publicProspectus } from "@/lib/prospectus";
import { formatProspectusDates, formatProspectusFirstDay, formatProspectusLastDay } from "@/lib/prospectus-rules";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ProspectusPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProspectusPageProps): Promise<Metadata> {
  const prospectus = await publicProspectus((await params).id);
  if (!prospectus) return {};
  return {
    title: `${prospectus.title} — ${prospectus.store.name}`,
    description: `${prospectus.offers.length} produits à prix promo à ${prospectus.store.name}, jusqu'au ${formatProspectusLastDay(prospectus.endsAt)}.`,
    robots: { index: false, follow: true },
  };
}

// Un prospectus de magasin en entier : ses produits à prix promo, pendant ses dates
export default async function ProspectusPage({ params }: ProspectusPageProps) {
  const [prospectus, store] = await Promise.all([publicProspectus((await params).id), currentStore()]);
  if (!prospectus) notFound();
  const started = prospectus.startsAt.getTime() <= Date.now();
  // Les prix ne valent que dans le magasin du prospectus
  const otherStore = store?.id !== prospectus.store.id;
  const applies = started && !otherStore;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 bg-brand-dark px-5 py-2 text-white">
          <span className={cn(displayFont.className, "text-lg font-bold uppercase tracking-wider")}>Prospectus · {prospectus.store.name}</span>
          <span className={cn(displayFont.className, "rounded-md bg-highlight px-2.5 py-0.5 text-base font-bold uppercase tracking-wide text-brand-dark")}>
            {formatProspectusDates(prospectus)}
          </span>
        </div>
        <div className="p-5 lg:p-6">
          <h1 className={cn(displayFont.className, "text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl")}>{prospectus.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {prospectus.offers.length} produit{prospectus.offers.length > 1 ? "s" : ""} à prix promo
            {started
              ? `, jusqu'au ${formatProspectusLastDay(prospectus.endsAt)}`
              : ` du ${formatProspectusFirstDay(prospectus.startsAt)} au ${formatProspectusLastDay(prospectus.endsAt)}`}
            . Retrait au drive ou livraison à domicile.
          </p>
        </div>
      </section>

      {(otherStore || !started) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-highlight/25 px-5 py-3 text-sm text-brand-dark">
          <Store size={18} className="shrink-0" aria-hidden />
          <span className="flex-1">
            {otherStore
              ? `Ces prix sont ceux de ${prospectus.store.name}. Dans votre magasin, les produits restent à leur prix habituel.`
              : "Ce prospectus n'a pas encore commencé : les produits sont encore à leur prix habituel."}
          </span>
          {otherStore && <StoreButton variant="link" />}
        </div>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {prospectus.offers.map((offer) => {
          // Prix du prospectus seulement là où il s'applique : magasin du client, prospectus commencé
          const prices = applies ? offer : offer.catalog;
          return (
            <li key={offer.id}>
              <ProductCard
                id={offer.id}
                name={offer.name}
                price={prices.price}
                regularPrice={prices.regularPrice}
                netContent={offer.netContent}
                picture={offer.picture}
                nutriScore={offer.nutriScore ?? undefined}
                brand={offer.brand}
                promoEndsAt={prices.promoEndsAt}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
