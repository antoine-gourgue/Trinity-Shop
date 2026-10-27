import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, TriangleAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Confirmation de l’adresse e-mail — Trinity Shop",
  robots: { index: false, follow: false },
};

interface ConfirmationEmailPageProps {
  searchParams: Promise<{ statut?: string }>;
}

const MESSAGES = {
  verified: {
    title: "Adresse confirmée",
    text: "Merci ! Vous recevrez le suivi de vos commandes et les alertes que vous avez choisies à cette adresse.",
  },
  expired: {
    title: "Lien expiré",
    text: "Ce lien de confirmation n’est plus valable. Demandez-en un nouveau depuis votre espace client.",
  },
  invalid: {
    title: "Lien invalide",
    text: "Ce lien de confirmation n’est pas valable : il a peut-être été envoyé avant un changement d’adresse. Demandez-en un nouveau depuis votre espace client.",
  },
};

// Résultat du clic sur le lien de confirmation de l'adresse e-mail
export default async function ConfirmationEmailPage({ searchParams }: ConfirmationEmailPageProps) {
  const { statut } = await searchParams;
  const outcome = statut === "verified" || statut === "expired" ? statut : "invalid";
  const { title, text } = MESSAGES[outcome];
  const verified = outcome === "verified";

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        {verified ? <MailCheck size={26} aria-hidden /> : <TriangleAlert size={26} aria-hidden />}
      </span>
      <h1 className="mt-4 text-2xl font-black">{title}</h1>
      <p className="mt-2 text-muted-foreground">{text}</p>
      <Link
        href={verified ? "/" : "/user"}
        className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-brand-dark"
      >
        {verified ? "Faire mes courses" : "Mon espace client"}
      </Link>
    </div>
  );
}
