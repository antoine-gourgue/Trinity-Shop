import Image from "next/image";
import { ean13Pattern, formatCardNumber } from "@/lib/loyalty";
import { cn } from "@/lib/utils";

interface LoyaltyCardProps {
  number: string;
  holder: string;
  points: number;
  className?: string;
}

// Carte Trinity dématérialisée, avec son code-barres EAN-13 à présenter en caisse
export default function LoyaltyCard({ number, holder, points, className }: LoyaltyCardProps) {
  const pattern = ean13Pattern(number);

  return (
    <div
      className={cn(
        "relative aspect-[1.586] w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-brand-dark to-primary p-5 text-white shadow-xl sm:p-6",
        className
      )}
    >
      <span aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
      <span aria-hidden className="absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-highlight/20" />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <Image src="/assets/trinity-logo.png" alt="" width={26} height={26} />
          </span>
          <span className="leading-none">
            <span className="block text-lg font-black tracking-tight">TRINITY</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-highlight">Carte de fidélité</span>
          </span>
        </div>
        <div className="text-right leading-none">
          <span className="block text-2xl font-black">{points}</span>
          <span className="text-[11px] font-semibold text-white/75">point{points > 1 ? "s" : ""}</span>
        </div>
      </div>

      <p className="relative mt-3 text-sm font-bold uppercase tracking-wide sm:mt-5">{holder}</p>

      <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white px-4 pb-2 pt-3 sm:inset-x-6 sm:bottom-6">
        <svg viewBox="0 0 95 32" preserveAspectRatio="none" className="h-10 w-full sm:h-12" role="img" aria-label={`Code-barres ${number}`}>
          {[...pattern].map((bit, index) =>
            bit === "1" ? <rect key={index} x={index} y={0} width={1} height={32} fill="#1d272a" /> : null
          )}
        </svg>
        <p className="mt-1 text-center font-mono text-xs font-bold tracking-[0.3em] text-brand-dark">{formatCardNumber(number)}</p>
      </div>
    </div>
  );
}
