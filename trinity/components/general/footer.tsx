import Link from "next/link";
import { CreditCard, Leaf, ShoppingBasket, Store } from "lucide-react";
import Logo from "@/components/general/logo";
import type { RayonLink } from "@/lib/rayons";

const REASSURANCES = [
  {
    icon: Store,
    title: "Drive ou livraison",
    text: "Retrait en magasin ou livraison à domicile, au choix.",
  },
  {
    icon: ShoppingBasket,
    title: "Préparée avec soin",
    text: "Nos équipes font vos courses comme vous les feriez.",
  },
  {
    icon: Leaf,
    title: "Fraîcheur sélectionnée",
    text: "Des dates limites choisies avec soin, rayon par rayon.",
  },
  {
    icon: CreditCard,
    title: "Paiement sécurisé",
    text: "Carte bancaire, Visa et Mastercard acceptées.",
  },
];

const HELP_LINKS = [
  { href: "/legal/faq", label: "Questions fréquentes" },
  { href: "/legal/contact", label: "Nous contacter" },
  { href: "/legal/loyalty-program", label: "Programme fidélité" },
];

const LEGAL_LINKS = [
  { href: "/legal/mention-legal", label: "Mentions légales" },
  { href: "/legal/privacy-policy", label: "Politique de confidentialité" },
  { href: "/legal/cookie", label: "Gestion des cookies" },
];

const PAYMENT_METHODS = ["CB", "Visa", "Mastercard"];

interface FooterProps {
  rayons: RayonLink[];
}

export default function Footer({ rayons }: FooterProps) {
  return (
    <footer className="mt-12 bg-brand-dark text-white">
      <div className="bg-primary">
        <ul className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {REASSURANCES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon size={24} aria-hidden />
              </span>
              <div>
                <p className="font-extrabold">{title}</p>
                <p className="mt-0.5 text-sm text-white/80">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm text-white/70">
            Votre supermarché en ligne à Rennes : faites vos courses en quelques clics et
            récupérez-les au drive ou chez vous.
          </p>
        </div>

        <FooterColumn title="Nos rayons">
          {rayons.map((rayon) => (
            <FooterLink key={rayon.slug} href={rayon.href}>
              {rayon.name}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Aide">
          {HELP_LINKS.map((link) => (
            <FooterLink key={link.href} href={link.href}>
              {link.label}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Informations légales">
          {LEGAL_LINKS.map((link) => (
            <FooterLink key={link.href} href={link.href}>
              {link.label}
            </FooterLink>
          ))}
        </FooterColumn>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-5 text-xs text-white/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Trinity Shop · Projet de démonstration, paiement simulé.</p>
          <ul className="flex items-center gap-2" aria-label="Moyens de paiement acceptés">
            {PAYMENT_METHODS.map((method) => (
              <li
                key={method}
                className="rounded-md bg-white px-2.5 py-1 text-[11px] font-extrabold text-brand-dark"
              >
                {method}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-extrabold uppercase tracking-wider text-highlight">{title}</p>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-white/80 transition-colors hover:text-white hover:underline">
        {children}
      </Link>
    </li>
  );
}
