import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ResetPasswordForm from "@/components/auth/reset-password-form";
import { resetLinkSchema } from "@/schemas/passwordResetSchema";
import { isPasswordResetLinkValid } from "@/services/auth/passwordReset";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — Trinity Shop",
  // Le jeton figure dans l'URL : il ne doit pas partir vers un autre site dans l'en-tête Referer
  referrer: "no-referrer",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Même présentation que les pages de connexion et d'inscription
function ResetFrame({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
      <div className="p-6 flex justify-center items-center w-full">
        <div className="w-full max-w-sm flex flex-col gap-10">
          <div className="text-center">
            <h1 className="font-black text-2xl md:text-4xl">{title}</h1>
            <h2 className="text-sm md:text-lg mt-2 text-muted-foreground">{subtitle}</h2>
          </div>
          {children}
          <p className="text-xs text-slate-500 text-center mt-4">
            © 2026 Trinity Shop, tous droits réservés
          </p>
        </div>
      </div>
  );
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const link = resetLinkSchema.safeParse(await searchParams);

  // Le lien est vérifié dès l'affichage, puis de nouveau par la server action à l'envoi du formulaire
  if (link.success && (await isPasswordResetLinkValid(link.data.email, link.data.token))) {
    return (
      <ResetFrame
        title="Nouveau mot de passe"
        subtitle={
          <>
            Choisissez le nouveau mot de passe du compte <span className="font-semibold text-foreground">{link.data.email}</span>.
          </>
        }
      >
        <ResetPasswordForm email={link.data.email} token={link.data.token} />
      </ResetFrame>
    );
  }

  return (
    <ResetFrame
      title="Lien invalide ou expiré"
      subtitle="Ce lien de réinitialisation n’est plus valable : il a déjà servi, a été remplacé par une demande plus récente ou date de plus d’une heure."
    >
      <div className="flex flex-col gap-4">
        <Button asChild className="rounded-full font-bold" size="lg">
          <Link href="/auth/mot-de-passe-oublie">Faire une nouvelle demande</Link>
        </Button>
        <p className="text-center text-sm">
          Vous vous souvenez de votre mot de passe ?
          <Link className="ml-1 text-primary font-bold" href="/auth/signin">
            Se connecter
          </Link>
        </p>
      </div>
    </ResetFrame>
  );
}
