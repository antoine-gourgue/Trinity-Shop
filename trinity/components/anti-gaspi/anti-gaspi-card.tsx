import Link from "next/link";
import ProductImage from "@/components/product/product-image";
import AddAntiGaspiButton from "@/components/anti-gaspi/add-anti-gaspi-button";
import { daysLeftLabel, formatBestBefore } from "@/lib/anti-gaspi";
import type { AntiGaspiOffer } from "@/lib/anti-gaspi-offers";
import { formatBrand, formatPrice } from "@/lib/format";

// Carte d'un produit à date courte : remise, date limite, unités restantes et prix anti-gaspi
export default function AntiGaspiCard({ offer }: { offer: AntiGaspiOffer }) {
  const { product } = offer;
  const href = `/product/${product.id}`;
  return (
    <article className="flex h-full flex-col rounded-xl border-2 border-bio/30 bg-card p-3 sm:p-4">
      <Link href={href} className="relative block aspect-square overflow-hidden rounded-lg bg-white">
        <ProductImage src={product.picture} alt={product.name} sizes="(min-width: 1024px) 20vw, 46vw" className="p-2" />
        <span className="absolute left-0 top-0 rounded-md bg-bio px-2 py-0.5 text-xs font-black text-white">−{offer.percent} %</span>
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">{formatBrand(product.brand)}</p>
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-xs font-bold text-bio">
          Date limite {daysLeftLabel(offer.days)} · {formatBestBefore(offer.bestBefore)}
        </p>
        <p className="text-xs text-muted-foreground">
          {[product.netContent, `plus que ${offer.quantity}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p>
          <span className="block text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
          <span className="block text-lg font-black text-bio">{formatPrice(offer.unitPrice)}</span>
        </p>
        <AddAntiGaspiButton lotId={offer.lotId} productName={product.name} />
      </div>
    </article>
  );
}
