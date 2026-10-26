import Price from "@/components/product/price";
import { discountPercent, formatPrice } from "@/lib/format";
import { formatUnitPrice } from "@/lib/product-info";
import { cn } from "@/lib/utils";

interface PriceBlockProps {
  price: number;
  regularPrice?: number | null;
  netContent?: string | null;
  size?: "md" | "lg";
  className?: string;
}

// Prix de vente, prix barré en cas de promotion et prix au kilo / litre
export default function PriceBlock({ price, regularPrice, netContent, size = "md", className }: PriceBlockProps) {
  const discount = discountPercent(price, regularPrice);
  const unitPrice = formatUnitPrice(price, netContent);

  return (
    <div className={cn("flex flex-col", className)}>
      {discount && regularPrice && (
        <span className={cn("text-muted-foreground line-through", size === "lg" ? "text-base" : "text-xs")}>
          <span className="sr-only">Au lieu de </span>
          {formatPrice(regularPrice)}
        </span>
      )}
      <Price value={price} size={size} className={discount ? "text-promo" : undefined} />
      {unitPrice && (
        <span className={cn("mt-1 text-muted-foreground", size === "lg" ? "text-sm" : "text-[11px]")}>
          {unitPrice}
        </span>
      )}
    </div>
  );
}
