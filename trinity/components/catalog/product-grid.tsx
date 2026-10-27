import type { Brand, Product } from "@prisma/client";
import ProductCard from "@/components/product/productCard";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  products: (Product & { brand: Brand | null })[];
  className?: string;
}

export default function ProductGrid({ products, className }: ProductGridProps) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4", className)}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard
            id={product.id}
            name={product.name}
            price={product.price}
            regularPrice={product.regularPrice}
            netContent={product.netContent}
            picture={product.picture}
            nutriScore={product.nutriScore ?? undefined}
            brand={product.brand?.name}
            promoEndsAt={product.promoEndsAt}
          />
        </li>
      ))}
    </ul>
  );
}
