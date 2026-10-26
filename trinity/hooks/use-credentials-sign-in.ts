"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCart } from "@/app/contexts/CartContext";
import { authErrorMessage } from "@/lib/auth-messages";

// Page de retour après connexion : uniquement un chemin du site, jamais les pages d'authentification
function callbackPath() {
  const value = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!value) return "/";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith("/auth") || url.pathname.startsWith("/api/auth")) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

// Connexion (ou inscription) par identifiants depuis le navigateur : next-auth met à jour la
// session client, donc l'en-tête passe en mode connecté sans recharger la page. On recharge
// ensuite le panier du compte puis on rejoint la page demandée.
export function useCredentialsSignIn() {
  const router = useRouter();
  const { refreshCart } = useCart();

  return async (values: Record<string, string>): Promise<{ error: string } | undefined> => {
    const result = await signIn("credentials", { ...values, redirect: false });
    if (!result || result.error) return { error: authErrorMessage(result?.code) };

    await refreshCart().catch(() => undefined);
    router.replace(callbackPath());
    router.refresh();
  };
}
