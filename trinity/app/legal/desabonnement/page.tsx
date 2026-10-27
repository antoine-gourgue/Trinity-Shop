import type { Metadata } from "next";
import Link from "next/link";
import { BellOff, TriangleAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Désinscription — Trinity Shop",
  robots: { index: false, follow: false },
};

interface DesabonnementPageProps {
  searchParams: Promise<{ erreur?: string; type?: string }>;
}

// Ce que le client ne recevra plus, selon le lien sur lequel il a cliqué
const STOPPED = {
  "cart-reminders": "Vous ne recevrez plus de rappels quand des articles restent dans votre panier.",
  "favorite-promos": "Vous ne recevrez plus d’alertes quand vos favoris passent en promotion.",
};

// Confirmation après un clic sur « Ne plus recevoir ces rappels / alertes » dans un e-mail
export default async function DesabonnementPage({ searchParams }: DesabonnementPageProps) {
  const { erreur, type } = await searchParams;
  const failed = erreur === "1";
  const stopped = type === "favorite-promos" ? STOPPED["favorite-promos"] : STOPPED["cart-reminders"];

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        {failed ? <TriangleAlert size={26} aria-hidden /> : <BellOff size={26} aria-hidden />}
      </span>
      <h1 className="mt-4 text-2xl font-black">{failed ? "Lien invalide" : "C’est noté"}</h1>
      <p className="mt-2 text-muted-foreground">
        {failed
          ? "Ce lien de désinscription n’est pas valable. Vous pouvez gérer vos e-mails depuis votre espace client."
          : `${stopped} Les e-mails liés à vos commandes continuent d’arriver.`}
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Vous pouvez changer d’avis à tout moment dans{" "}
        <Link href="/user/info" className="font-bold text-primary hover:underline">
          Mes informations
        </Link>
        .
      </p>
    </div>
  );
}
