import type { Metadata } from "next";
import Link from "next/link";
import { BellOff, TriangleAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Rappels de panier — Trinity Shop",
  robots: { index: false, follow: false },
};

interface DesabonnementPageProps {
  searchParams: Promise<{ erreur?: string }>;
}

// Confirmation après un clic sur « Ne plus recevoir ces rappels » dans un e-mail
export default async function DesabonnementPage({ searchParams }: DesabonnementPageProps) {
  const failed = (await searchParams).erreur === "1";

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        {failed ? <TriangleAlert size={26} aria-hidden /> : <BellOff size={26} aria-hidden />}
      </span>
      <h1 className="mt-4 text-2xl font-black">{failed ? "Lien invalide" : "C’est noté"}</h1>
      <p className="mt-2 text-muted-foreground">
        {failed
          ? "Ce lien de désinscription n’est pas valable. Vous pouvez gérer vos rappels depuis votre espace client."
          : "Vous ne recevrez plus de rappels quand des articles restent dans votre panier. Les e-mails liés à vos commandes continuent d’arriver."}
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Vous pouvez réactiver ces rappels à tout moment dans{" "}
        <Link href="/user/info" className="font-bold text-primary hover:underline">
          Mes informations
        </Link>
        .
      </p>
    </div>
  );
}
