import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AddToCartButton from "@/components/product/add-to-cart-button";
import DiscountFlag from "@/components/product/discount-flag";
import PriceBlock from "@/components/product/price-block";
import ProductImage from "@/components/product/product-image";
import { displayFont } from "@/lib/fonts";
import { formatPromoLastDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ProspectusItem {
  id: string;
  name: string;
  picture: string;
  price: number;
  regularPrice: number;
  netContent: string | null;
  percent: number;
  promoEndsAt: Date | null;
}

interface ProspectusProps {
  // Bandeau du haut : nom du prospectus et magasin concerné
  label: string;
  scope: string;
  description: string;
  href: string;
  items: ProspectusItem[];
}

// Prospectus de la semaine : les produits en promotion, 5 sur grand écran, 4 sinon
export default function Prospectus({ label, scope, description, href, items }: ProspectusProps) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="prospectus-title" className="mt-10 overflow-hidden rounded-xl border bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 bg-brand-dark px-5 py-2 text-white">
        <span className={cn(displayFont.className, "text-lg font-bold uppercase tracking-wider")}>{label}</span>
        <span className="text-xs font-semibold text-white/75">{scope}</span>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,14rem)_1fr] lg:gap-8 lg:p-6">
        <div className="flex flex-col">
          <h2 id="prospectus-title" className={cn(displayFont.className, "text-4xl font-extrabold uppercase leading-[0.92] lg:text-5xl")}>
            Les prix
            <br />
            qui comptent
            <br />
            <span className="text-promo">cette semaine</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          <Link
            href={href}
            className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-brand-dark"
          >
            Tout le prospectus <ArrowRight size={16} aria-hidden />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 xl:grid-cols-5">
          {items.map((item, index) => {
            const productHref = `/product/${item.id}`;
            return (
              <li key={item.id} className={cn("relative flex flex-col", index === 4 && "hidden xl:flex")}>
                {/* Hors de la photo, pour couvrir sa bordure : le drapeau est collé au bord */}
                <DiscountFlag percent={item.percent} className="absolute left-0 top-2.5 z-10" />
                <Link href={productHref} className="group relative block aspect-square overflow-hidden rounded-lg border bg-white">
                  <ProductImage
                    src={item.picture}
                    alt={item.name}
                    sizes="(min-width: 1280px) 15vw, (min-width: 640px) 20vw, 45vw"
                    className="p-3 transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
                <Link href={productHref} className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-5 hover:underline">
                  {item.name}
                </Link>
                <PriceBlock price={item.price} regularPrice={item.regularPrice} netContent={item.netContent} className="mt-2" />
                {item.promoEndsAt && <p className="mt-1 text-[11px] font-bold text-promo">jusqu&apos;au {formatPromoLastDay(item.promoEndsAt)}</p>}
                {/* En bas de la colonne : les boutons restent alignés, avec ou sans date de fin */}
                <div className="mt-auto pt-3">
                  <AddToCartButton productId={item.id} productName={item.name} className="w-full" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
