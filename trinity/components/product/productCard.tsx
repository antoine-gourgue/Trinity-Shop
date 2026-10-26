import Link from "next/link";
import PriceBlock from "@/components/product/price-block";
import ProductImage from "@/components/product/product-image";
import NutriScore from "@/components/product/nutri-score";
import AddToCartButton from "@/components/product/add-to-cart-button";
import { discountPercent, formatBrand, isBioBrand } from "@/lib/format";

interface ProductProps {
    id: string;
    name: string;
    price: number;
    regularPrice?: number | null;
    netContent?: string | null;
    picture: string;
    nutriScore?: string;
    brand?: string;
}

export default function ProductCard({ id, name, price, regularPrice, netContent, picture, nutriScore, brand }: ProductProps) {
    const href = `/product/${id}`;
    const discount = discountPercent(price, regularPrice);

    return (
        <article className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-lg sm:p-4">
            <Link href={href} className="relative block aspect-square overflow-hidden rounded-lg bg-white">
                <ProductImage
                    src={picture}
                    alt={name}
                    sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 46vw"
                    className="p-2 transition-transform duration-300 group-hover:scale-105"
                />
                {isBioBrand(brand) && (
                    <span className="absolute left-0 top-0 rounded-md bg-bio px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
                        Bio
                    </span>
                )}
                {discount && (
                    <span className="absolute right-0 top-0 rounded-md bg-promo px-2 py-0.5 text-xs font-black text-white">
                        -{discount} %
                    </span>
                )}
            </Link>

            <div className="mt-3 flex flex-1 flex-col">
                {brand && (
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">
                        {formatBrand(brand)}
                    </p>
                )}
                <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">
                    <Link href={href} className="hover:underline">
                        {name}
                    </Link>
                </h3>
                <p className="mt-0.5 h-4 truncate text-xs text-muted-foreground">{netContent}</p>
                <div className="mt-2 h-7">
                    <NutriScore grade={nutriScore} />
                </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <PriceBlock price={price} regularPrice={regularPrice} netContent={netContent} />
                <AddToCartButton productId={id} productName={name} />
            </div>
        </article>
    );
}
