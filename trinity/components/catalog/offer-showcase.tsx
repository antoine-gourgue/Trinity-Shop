import Link from "next/link";
import ProductImage from "@/components/product/product-image";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ShowcaseProduct {
  id: string;
  name: string;
  picture: string;
  percent: number;
  price: number;
  regularPrice: number;
}

interface OfferShowcaseProps {
  href: string;
  tone: "promo" | "bio";
  title: string;
  subtitle: string;
  products: ShowcaseProduct[];
}

// Carte d'offre façon prospectus : de vrais produits, chacun avec sa pastille de remise et son prix
export default function OfferShowcase({ href, tone, title, subtitle, products }: OfferShowcaseProps) {
  return (
    <Link href={href} className={cn("group flex flex-col rounded-3xl p-5 text-white", tone === "promo" ? "bg-promo" : "bg-bio")}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-2xl font-black leading-tight">{title}</span>
        <span className="shrink-0 text-sm font-bold underline-offset-4 group-hover:underline">Voir tout</span>
      </span>
      <span className="mt-0.5 text-sm text-white/85">{subtitle}</span>
      <span className="mt-4 grid flex-1 grid-cols-3 gap-2.5">
        {products.map((product) => (
          <span key={product.id} className="flex flex-col">
            <span className="relative aspect-square rounded-2xl bg-white">
              <ProductImage src={product.picture} alt={product.name} sizes="120px" className="p-2" />
              {/* Pastille de remise, posée de travers comme sur un prospectus */}
              <span className="absolute -right-1.5 -top-1.5 flex h-11 w-11 rotate-[-10deg] items-center justify-center rounded-full bg-highlight text-[13px] font-black leading-none text-promo shadow-sm">
                −{product.percent}%
              </span>
            </span>
            <span className="mt-1.5 text-center leading-tight">
              <span className="block text-[11px] text-white/75 line-through">{formatPrice(product.regularPrice)}</span>
              <span className="block text-base font-black">{formatPrice(product.price)}</span>
            </span>
          </span>
        ))}
      </span>
    </Link>
  );
}
