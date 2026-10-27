import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface DiscountFlagProps {
  percent: number;
  // Rouge pour une promotion, vert pour une date courte
  tone?: "promo" | "bio";
  className?: string;
}

// Remise en drapeau, collé au bord gauche de la photo du produit
export default function DiscountFlag({ percent, tone = "promo", className }: DiscountFlagProps) {
  return (
    <span
      className={cn(
        displayFont.className,
        "inline-block rounded-r-md py-0.5 pl-2 pr-2.5 text-lg font-extrabold leading-tight text-white",
        tone === "promo" ? "bg-promo" : "bg-bio",
        className
      )}
    >
      <span className="sr-only">{tone === "promo" ? "Promotion " : "Anti-gaspi "}</span>−{percent}&nbsp;%
    </span>
  );
}
