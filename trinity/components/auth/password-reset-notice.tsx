"use client";

import { useSearchParams } from "next/navigation";

// Bandeau de la page de connexion après une réinitialisation réussie (/auth/signin?reinitialise=1)
export default function PasswordResetNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("reinitialise") !== "1") return null;

  return (
    <p role="status" className="rounded-xl bg-bio/10 px-4 py-3 text-sm font-semibold text-bio">
      Votre mot de passe a bien été modifié. Connectez-vous avec votre nouveau mot de passe.
    </p>
  );
}
