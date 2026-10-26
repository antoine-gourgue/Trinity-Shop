import ProductImage from "@/components/product/product-image";
import { cn } from "@/lib/utils";

// Vignette produit du back-office ; dans son propre fichier pour servir aussi aux composants
// client (admin-bits importe des modules réservés au serveur)
export function ProductThumb({ src, alt, size = "md" }: { src: string; alt: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-xl border bg-white",
        size === "sm" ? "h-10 w-10" : size === "md" ? "h-12 w-12" : "h-24 w-24"
      )}
    >
      <ProductImage src={src} alt={alt} sizes="96px" className="p-1" />
    </span>
  );
}
