import { cn } from "@/lib/utils";
import { formatPrice, toEuros } from "@/lib/format";

interface PriceProps {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { euros: "text-lg", cents: "text-xs" },
  md: { euros: "text-2xl", cents: "text-sm" },
  lg: { euros: "text-4xl", cents: "text-lg" },
};

// Affichage façon étiquette de rayon : euros en grand, centimes en exposant
export default function Price({ value, size = "md", className }: PriceProps) {
  const [euros, cents] = toEuros(value).toFixed(2).split(".");

  return (
    <span
      className={cn("inline-flex items-start font-extrabold leading-none text-foreground", className)}
      aria-label={formatPrice(value)}
    >
      <span aria-hidden className={SIZES[size].euros}>
        {euros}
      </span>
      <span aria-hidden className={cn("mt-[0.15em] font-bold", SIZES[size].cents)}>
        ,{cents}&nbsp;€
      </span>
    </span>
  );
}
