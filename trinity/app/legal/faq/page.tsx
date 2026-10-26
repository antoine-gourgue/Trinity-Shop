import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { DELIVERY_FEE, FREE_DELIVERY_FROM } from "@/lib/delivery";
import { POINTS_PER_VOUCHER, VOUCHER_VALUE } from "@/lib/loyalty";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Questions fréquentes — Trinity Shop" };

// Réponses alignées sur le fonctionnement réel du site (créneaux, livraison, paiement, fidélité)
const SECTIONS: { title: string; questions: { question: string; answer: React.ReactNode }[] }[] = [
  {
    title: "Retrait et livraison",
    questions: [
      {
        question: "Comment récupérer mes courses ?",
        answer: (
          <>
            Au moment de commander, vous choisissez entre le <strong>retrait au drive</strong> Trinity U Rennes Epitech,
            gratuit, et la <strong>livraison à domicile</strong>. Vos courses sont préparées par nos équipes pour le
            créneau que vous avez choisi.
          </>
        ),
      },
      {
        question: "Combien coûte la livraison à domicile ?",
        answer: (
          <>
            La livraison coûte {formatPrice(DELIVERY_FEE)} et elle est <strong>offerte dès {formatPrice(FREE_DELIVERY_FROM)}</strong>{" "}
            d’articles. Le retrait au drive est toujours gratuit.
          </>
        ),
      },
      {
        question: "Livrez-vous à l’international ?",
        answer:
          "Non. La livraison à domicile est proposée en France, à l’adresse de votre choix enregistrée dans votre espace client. Nous ne livrons pas à l’étranger.",
      },
      {
        question: "Quels sont les créneaux disponibles ?",
        answer:
          "Des créneaux d’une heure de 9h à 13h et de 14h à 20h, du lundi au samedi, à partir du lendemain et jusqu’à six jours à l’avance. Les mêmes créneaux servent au retrait et à la livraison.",
      },
      {
        question: "Où ajouter une adresse de livraison ?",
        answer: (
          <>
            Directement à l’étape « Retrait ou livraison » de votre commande, ou à tout moment dans{" "}
            <Link href="/user/addresses" className="font-bold text-primary hover:underline">
              Mes adresses
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    title: "Commande et paiement",
    questions: [
      {
        question: "Quels sont les moyens de paiement acceptés ?",
        answer:
          "La carte bancaire (CB, Visa, Mastercard), sur la page de paiement sécurisée de Stripe. Trinity Shop est un projet de démonstration : Stripe fonctionne en mode test, avec la carte 4242 4242 4242 4242, et aucun débit réel n’est effectué.",
      },
      {
        question: "Comment suivre ma commande ?",
        answer: (
          <>
            Toutes vos commandes sont dans{" "}
            <Link href="/user" className="font-bold text-primary hover:underline">
              votre espace client
            </Link>
            , avec leur créneau, leur détail et leur facture PDF à télécharger.
          </>
        ),
      },
      {
        question: "Puis-je annuler ma commande ?",
        answer: (
          <>
            Oui, tant que le créneau n’est pas passé :{" "}
            <Link href="/legal/contact" className="font-bold text-primary hover:underline">
              contactez-nous
            </Link>{" "}
            en indiquant votre numéro de commande. Les points Carte Trinity liés à la commande sont alors ajustés.
          </>
        ),
      },
    ],
  },
  {
    title: "Carte Trinity et produits",
    questions: [
      {
        question: "Comment fonctionne la Carte Trinity ?",
        answer: (
          <>
            Gratuite et dématérialisée, elle vous fait gagner 1 point par euro dépensé en articles. Chaque tranche de{" "}
            {POINTS_PER_VOUCHER} points vous donne un bon de {formatPrice(VOUCHER_VALUE)} à utiliser au paiement.{" "}
            <Link href="/legal/loyalty-program" className="font-bold text-primary hover:underline">
              Voir le programme
            </Link>
          </>
        ),
      },
      {
        question: "D’où viennent les informations sur les produits ?",
        answer:
          "Les ingrédients, allergènes, valeurs nutritionnelles et le Nutri-Score proviennent d’Open Food Facts, une base de données collaborative et ouverte. Les photos sont celles fournies par les fabricants.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <nav aria-label="Fil d'Ariane" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary hover:underline">
          Accueil
        </Link>
        <ChevronRight size={14} aria-hidden />
        <span className="font-semibold text-foreground">Questions fréquentes</span>
      </nav>

      <section className="rounded-3xl bg-brand-dark p-6 text-white md:p-10">
        <span className="inline-block -rotate-2 rounded-lg bg-highlight px-3 py-1 text-sm font-black text-brand-dark">Aide</span>
        <h1 className="mt-4 flex items-center gap-3 text-3xl font-black md:text-4xl">
          <HelpCircle size={32} className="shrink-0 text-highlight" aria-hidden />
          Questions fréquentes
        </h1>
        <p className="mt-3 max-w-xl text-white/75">
          Retrait au drive, livraison, paiement, Carte Trinity : l’essentiel pour faire vos courses en ligne.
        </p>
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="mb-4 text-2xl font-black">{section.title}</h2>
          <div className="space-y-3">
            {section.questions.map((item) => (
              <details key={item.question} className="group overflow-hidden rounded-2xl border bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown size={20} className="shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="border-t px-5 py-4 leading-relaxed text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Une autre question ?{" "}
        <Link href="/legal/contact" className="font-bold text-primary hover:underline">
          Contactez-nous
        </Link>
      </p>
    </div>
  );
}
