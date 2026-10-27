import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductImage from "@/components/product/product-image";
import PromoBurst from "@/components/product/promo-burst";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ShowcaseProduct {
  id: string;
  name: string;
  picture: string;
  percent: number;
  price: number;
  regularPrice: number;
  // Précision sous le prix (« DLC demain »)
  note?: string;
}

interface OfferShowcaseProps {
  href: string;
  tone: "promo" | "bio";
  title: string;
  subtitle: string;
  products: ShowcaseProduct[];
}

// Carte d'offre façon prospectus : trois vrais produits, chacun avec son étoile de remise et son
// étiquette de prix
export default function OfferShowcase({ href, tone, title, subtitle, products }: OfferShowcaseProps) {
  const accent = tone === "promo" ? "text-promo" : "text-bio";
  return (
    <Link href={href} className={cn("group flex flex-col rounded-3xl p-5 text-white", tone === "promo" ? "bg-promo" : "bg-bio")}>
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-2xl font-black leading-tight">{title}</span>
          <span className="mt-0.5 block text-sm text-white/85">{subtitle}</span>
        </span>
        <span className={cn("flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold", accent)}>
          Voir tout <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
      <span className="mt-5 grid flex-1 grid-cols-3 gap-3">
        {products.map((product) => (
          <span key={product.id} className="relative flex flex-col rounded-2xl bg-white text-foreground shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]">
            <span className="relative aspect-[5/4] overflow-hidden rounded-t-2xl">
              <ProductImage src={product.picture} alt={product.name} sizes="140px" className="p-2.5" />
            </span>
            {/* Étiquette de prix : ancien prix barré, nouveau prix */}
            <span className="mt-auto border-t border-dashed px-2.5 py-2 leading-tight">
              <span className="block text-[11px] text-muted-foreground line-through">{formatPrice(product.regularPrice)}</span>
              <span className={cn("block text-lg font-black tracking-tight", accent)}>{formatPrice(product.price)}</span>
              {product.note && <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{product.note}</span>}
            </span>
            <PromoBurst percent={product.percent} className="-right-3 -top-3" />
          </span>
        ))}
      </span>
    </Link>
  );
}
