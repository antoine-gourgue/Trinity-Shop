import Link from "next/link";
import { Gift, HelpCircle, Phone, Truck } from "lucide-react";
import StoreButton from "@/components/store/store-button";

const LINKS = [
  { href: "/legal/loyalty-program", label: "Programme fidélité", icon: Gift },
  { href: "/legal/faq", label: "Aide & FAQ", icon: HelpCircle },
  { href: "/legal/contact", label: "Nous contacter", icon: Phone },
];

// Bandeau du haut de page : magasin du visiteur, et liens utiles sur ordinateur
export default function TopBar() {
  return (
    <div className="bg-brand-dark text-xs text-white">
      <div className="flex h-8 items-center px-4 md:hidden">
        <StoreButton variant="bar" />
      </div>
      <div className="mx-auto hidden h-9 max-w-[1400px] items-center justify-between px-6 md:flex">
        <div className="flex min-w-0 items-center gap-5">
          <StoreButton variant="bar" />
          <span className="hidden items-center gap-1.5 text-white/80 lg:flex">
            <Truck size={14} aria-hidden />
            Drive et livraison à domicile
          </span>
        </div>
        <nav aria-label="Liens utiles" className="flex items-center gap-5">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 text-white/80 transition-colors hover:text-white"
            >
              <Icon size={14} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
