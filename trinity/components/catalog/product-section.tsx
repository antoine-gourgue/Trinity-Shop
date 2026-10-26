import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Brand, Product } from "@prisma/client";
import ProductCard from "@/components/product/productCard";
import ProductCarousel from "@/components/catalog/product-carousel";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  href?: string;
  products: (Product & { brand: Brand | null })[];
}

// Section titrée avec un carrousel de produits et un lien « Voir tout »
export default function ProductSection({ title, subtitle, href, products }: ProductSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black md:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            Voir tout <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </div>
      <ProductCarousel label={title}>
        {products.map((product) => (
          <li
            key={product.id}
            className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%] xl:w-[19%]"
          >
            <ProductCard
              id={product.id}
              name={product.name}
              price={product.price}
              picture={product.picture}
              nutriScore={product.nutriScore ?? undefined}
              brand={product.brand?.name}
            />
          </li>
        ))}
      </ProductCarousel>
    </section>
  );
}
