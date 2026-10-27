import { cn } from "@/lib/utils";

interface OfferRibbonProps {
  tone: "promo" | "bio";
  label: string;
  // Échéance de l'offre, à droite (« jusqu'au 02/11 », « date limite demain »)
  detail?: string | null;
  className?: string;
}

// Bandeau coloré en haut d'une carte produit : l'offre en cours, comme sur les drives des enseignes
export default function OfferRibbon({ tone, label, detail, className }: OfferRibbonProps) {
  return (
    <p
      className={cn(
        "-mx-3 -mt-3 mb-3 flex items-center justify-between gap-2 rounded-t-[11px] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white sm:-mx-4 sm:-mt-4 sm:mb-4 sm:px-4",
        tone === "promo" ? "bg-promo" : "bg-bio",
        className
      )}
    >
      <span className="truncate">{label}</span>
      {detail && <span className="shrink-0 font-bold normal-case tracking-normal text-white/90">{detail}</span>}
    </p>
  );
}
