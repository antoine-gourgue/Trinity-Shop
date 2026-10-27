import type { Metadata } from "next";
import { CalendarClock, HandHeart, Recycle, Store } from "lucide-react";
import { currentStore } from "@/lib/current-store";
import { storeOffers } from "@/lib/anti-gaspi-offers";
import { ANTI_GASPI_WINDOW } from "@/lib/anti-gaspi";
import AntiGaspiCard from "@/components/anti-gaspi/anti-gaspi-card";
import StoreButton from "@/components/store/store-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Anti-gaspi — Trinity Shop",
  description: "Produits à date courte de votre magasin Trinity, jusqu'à −50 % : bons à consommer, trop bons pour être jetés.",
  alternates: { canonical: "/anti-gaspi" },
};

const STEPS = [
  { icon: CalendarClock, title: "Des dates courtes", text: `Votre magasin met en ligne ses produits ${ANTI_GASPI_WINDOW} jours avant leur date limite.` },
  { icon: Recycle, title: "Jusqu'à −50 %", text: "−20 %, puis −30 % à J-3, −40 % à J-2 et −50 % la veille de la date." },
  { icon: HandHeart, title: "Rien ne se perd", text: "Ce qui n'est pas vendu est donné à des associations locales." },
];

// Rayon anti-gaspi : les lots à date courte du magasin du client
export default async function AntiGaspiPage() {
  const store = await currentStore();
  const offers = store ? await storeOffers(store.id) : [];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <section className="relative overflow-hidden rounded-3xl bg-bio px-6 py-8 text-white sm:px-10 sm:py-10">
        <Recycle size={180} className="absolute -bottom-10 -right-8 rotate-12 text-white/10" aria-hidden />
        <p className="text-sm font-bold uppercase tracking-wide text-white/80">{store ? store.name : "Votre magasin Trinity"}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Anti-gaspi</h1>
        <p className="mt-2 max-w-xl text-white/85">
          Des produits bons à consommer mais proches de leur date limite, à prix réduit. Plus la date approche, plus le prix baisse.
        </p>
        <ul className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3 rounded-2xl bg-white/10 p-4">
              <Icon size={22} className="shrink-0 text-highlight" aria-hidden />
              <span>
                <span className="block font-extrabold">{title}</span>
                <span className="block text-sm text-white/80">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {!store ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center ring-1 ring-border">
          <Store size={32} className="text-primary" aria-hidden />
          <p className="text-lg font-extrabold">Choisissez votre magasin</p>
          <p className="max-w-sm text-sm text-muted-foreground">Les offres anti-gaspi dépendent des produits à date courte de chaque magasin.</p>
          <StoreButton variant="link" />
        </div>
      ) : offers.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center ring-1 ring-border">
          <Recycle size={32} className="text-bio" aria-hidden />
          <p className="text-lg font-extrabold">Pas d’offre anti-gaspi pour le moment</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Votre magasin met en ligne ses dates courtes au fil des jours : revenez bientôt, ou <StoreButton variant="link" />.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted-foreground">
            {offers.length} produit{offers.length > 1 ? "s" : ""} à date courte · retrait ou livraison avant la date limite
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {offers.map((offer) => (
              <li key={offer.lotId}>
                <AntiGaspiCard offer={offer} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
