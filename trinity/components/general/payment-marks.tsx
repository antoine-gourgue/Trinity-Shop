import { cn } from "@/lib/utils";

// Cartes acceptées, comme sur une vitrine de magasin : chaque marque sur une petite carte blanche
// (dessins simplifiés des logos CB, Visa et Mastercard)

function CardFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li>
      <svg viewBox="0 0 40 26" className="h-[26px] w-10" role="img" aria-label={label}>
        <rect x="0.5" y="0.5" width="39" height="25" rx="4" fill="#fff" stroke="rgba(0,0,0,0.12)" />
        {children}
      </svg>
    </li>
  );
}

export default function PaymentMarks({ className, label = "Moyens de paiement acceptés" }: { className?: string; label?: string }) {
  return (
    <ul className={cn("flex items-center gap-1.5", className)} aria-label={label}>
      <CardFrame label="Carte bancaire CB">
        <rect x="6" y="5" width="28" height="16" rx="2.5" fill="#1b5e9e" />
        <path d="M6 13V7.5A2.5 2.5 0 0 1 8.5 5H20z" fill="#00a3a6" />
        <text x="20" y="16.6" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="10" fontWeight="900" fill="#fff">
          CB
        </text>
      </CardFrame>
      <CardFrame label="Visa">
        <text
          x="20"
          y="17"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="11"
          fontStyle="italic"
          fontWeight="900"
          letterSpacing="-0.3"
          fill="#1a1f71"
        >
          VISA
        </text>
      </CardFrame>
      <CardFrame label="Mastercard">
        <circle cx="16.5" cy="13" r="7" fill="#eb001b" />
        <circle cx="23.5" cy="13" r="7" fill="#f79e1b" />
        {/* Partie commune des deux cercles */}
        <path d="M20 6.94a7 7 0 0 1 0 12.12a7 7 0 0 1 0-12.12z" fill="#ff5f00" />
      </CardFrame>
    </ul>
  );
}
