import { cn } from "@/lib/utils";

// Étoile à 12 branches des prospectus de supermarché, calculée une fois
const POINTS = Array.from({ length: 24 }, (_, index) => {
  const angle = (index * Math.PI) / 12 - Math.PI / 2;
  const radius = index % 2 === 0 ? 50 : 41;
  return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(50 + radius * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

// Pastille « flash » de remise, posée de travers sur la photo du produit
export default function PromoBurst({ percent, className }: { percent: number; className?: string }) {
  return (
    <span className={cn("absolute flex h-14 w-14 rotate-[-12deg] items-center justify-center drop-shadow-sm", className)} aria-label={`Remise de ${percent} %`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <polygon points={POINTS} className="fill-highlight" />
      </svg>
      <span className="relative flex items-start font-black leading-none text-promo" aria-hidden>
        <span className="text-[15px]">−</span>
        <span className="text-lg tracking-tight">{percent}</span>
        <span className="mt-0.5 text-[10px]">%</span>
      </span>
    </span>
  );
}
