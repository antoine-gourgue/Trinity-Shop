import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCarousel from "@/components/catalog/product-carousel";
import ProductImage from "@/components/product/product-image";
import { displayFont } from "@/lib/fonts";
import { ean13CheckDigit, ean13Pattern } from "@/lib/loyalty";
import { cn } from "@/lib/utils";

export interface BannerProduct {
  id: string;
  name: string;
  picture: string;
}

export type BannerVisual =
  | { kind: "products"; products: BannerProduct[] }
  | { kind: "pickup"; weekday: string; date: string; hour: string }
  | { kind: "card" };

export interface OperationBanner {
  href: string;
  tone: "promo" | "bio" | "brand" | "highlight";
  kicker: string;
  title: string;
  text: string;
  cta: string;
  visual?: BannerVisual;
}

const TONES = {
  promo: { banner: "bg-promo text-white", cta: "bg-white text-promo" },
  bio: { banner: "bg-bio text-white", cta: "bg-white text-bio" },
  brand: { banner: "bg-brand-dark text-white", cta: "bg-white text-brand-dark" },
  highlight: { banner: "bg-highlight text-brand-dark", cta: "bg-brand-dark text-white" },
};

// Numéro de démonstration pour le code-barres de la carte dessinée
const SAMPLE_CARD = `299104738215${ean13CheckDigit("299104738215")}`;

// Les produits de l'opération, détourés dans des pastilles blanches
function ProductDiscs({ products }: { products: BannerProduct[] }) {
  return (
    // Largeurs en pourcentage : trois pastilles qui se chevauchent remplissent la zone, quelle que soit
    // la taille de la bannière
    <span className="flex w-full items-center justify-center">
      {products.map((product, index) => (
        <span
          key={product.id}
          className={cn(
            "relative -ml-[13%] aspect-square w-[42%] shrink-0 rounded-full bg-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.35)] first:ml-0",
            index === 1 ? "z-10 -translate-y-[8%]" : "translate-y-[6%]"
          )}
        >
          <ProductImage src={product.picture} alt="" sizes="140px" className="p-[16%]" />
        </span>
      ))}
    </span>
  );
}

// Le prochain retrait, comme un ticket de drive
function PickupTicket({ weekday, date, hour }: { weekday: string; date: string; hour: string }) {
  return (
    <span className="block w-32 -rotate-3 rounded-lg bg-white p-3 text-brand-dark shadow-[0_10px_24px_-8px_rgba(0,0,0,0.45)] sm:w-48 sm:p-4">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">Retrait dès</span>
      <span className={cn(displayFont.className, "mt-1 block text-2xl font-extrabold uppercase leading-none sm:text-4xl")}>{weekday}</span>
      <span className="mt-0.5 block text-xs font-bold sm:text-sm">{date}</span>
      <span className="mt-2 block border-t border-dashed border-brand-dark/30 pt-2 text-base font-black sm:text-xl">{hour}</span>
    </span>
  );
}

// La Carte Trinity, simplifiée
function LoyaltyCardSketch() {
  const pattern = ean13Pattern(SAMPLE_CARD);
  return (
    <span className="relative block aspect-[1.586] w-32 rotate-6 rounded-lg bg-brand-dark p-2.5 text-white shadow-[0_12px_26px_-8px_rgba(0,0,0,0.45)] sm:w-56 sm:rounded-xl sm:p-4">
      <span className="flex items-center gap-1.5 sm:gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-white sm:h-8 sm:w-8 sm:rounded-md">
          <Image src="/assets/trinity-logo.png" alt="" width={20} height={20} className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </span>
        <span className="text-[10px] font-black tracking-tight sm:text-base">TRINITY</span>
      </span>
      <span className="absolute inset-x-2.5 bottom-2.5 rounded bg-white px-1.5 py-1 sm:inset-x-4 sm:bottom-4 sm:rounded-md sm:px-3 sm:py-2">
        <svg viewBox="0 0 95 20" preserveAspectRatio="none" className="h-4 w-full sm:h-8" aria-hidden>
          {[...pattern].map((bit, index) => (bit === "1" ? <rect key={index} x={index} y={0} width={1} height={20} fill="#1d272a" /> : null))}
        </svg>
      </span>
    </span>
  );
}

function Visual({ visual }: { visual: BannerVisual }) {
  switch (visual.kind) {
    case "products":
      return <ProductDiscs products={visual.products} />;
    case "pickup":
      return <PickupTicket weekday={visual.weekday} date={visual.date} hour={visual.hour} />;
    case "card":
      return <LoyaltyCardSketch />;
  }
}

// Une bannière d'opération ; en aperçu (back-office), elle ne mène nulle part
export function BannerCard({ banner, preview = false }: { banner: OperationBanner; preview?: boolean }) {
  const tone = TONES[banner.tone];
  const hasVisual = banner.visual && (banner.visual.kind !== "products" || banner.visual.products.length > 0);
  const className = cn("group relative flex h-full min-h-[190px] overflow-hidden rounded-xl sm:min-h-[230px] xl:min-h-[260px]", tone.banner);
  const content = (
    <>
      <span className={cn("relative z-10 flex flex-col justify-center p-5 sm:p-7", hasVisual ? "w-[60%] sm:w-[55%]" : "w-full")}>
        <span className={cn(displayFont.className, "text-sm font-bold uppercase tracking-wider opacity-90 sm:text-base")}>{banner.kicker}</span>
        <span className={cn(displayFont.className, "mt-1 text-[2.4rem] font-extrabold uppercase leading-[0.88] sm:text-5xl xl:text-6xl")}>
          {banner.title}
        </span>
        <span className="mt-2 text-xs font-semibold leading-snug opacity-90 sm:text-sm">{banner.text}</span>
        <span className={cn("mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold sm:text-sm", tone.cta)}>
          {banner.cta}
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
      {banner.visual && hasVisual && (
        <span aria-hidden className="absolute inset-y-0 right-0 flex w-[42%] items-center justify-center pr-3 sm:w-[45%] sm:pr-5">
          <Visual visual={banner.visual} />
        </span>
      )}
    </>
  );
  return preview ? (
    <div className={className}>{content}</div>
  ) : (
    <Link href={banner.href} className={className}>
      {content}
    </Link>
  );
}

// Les opérations du moment, en grandes bannières qui défilent (deux à la fois sur grand écran)
export default function OperationBanners({ banners }: { banners: OperationBanner[] }) {
  return (
    <ProductCarousel label="Opérations du moment" previousLabel="Opérations précédentes" nextLabel="Opérations suivantes" arrowTop="top-1/2">
      {banners.map((banner) => (
        <li key={banner.href} className="w-[88%] shrink-0 snap-start sm:w-[72%] lg:w-[calc(50%-0.5rem)]">
          <BannerCard banner={banner} />
        </li>
      ))}
    </ProductCarousel>
  );
}
