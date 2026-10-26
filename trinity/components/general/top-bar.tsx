import Link from "next/link";
import { Gift, HelpCircle, MapPin, Phone, Truck } from "lucide-react";

const LINKS = [
  { href: "/legal/loyalty-program", label: "Programme fidélité", icon: Gift },
  { href: "/legal/faq", label: "Aide & FAQ", icon: HelpCircle },
  { href: "/legal/contact", label: "Nous contacter", icon: Phone },
];

export default function TopBar() {
  return (
    <div className="hidden bg-brand-dark text-xs text-white md:block">
      <div className="mx-auto flex h-9 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 font-bold">
            <MapPin size={14} className="text-highlight" aria-hidden />
            Trinity U Rennes Epitech
          </span>
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
