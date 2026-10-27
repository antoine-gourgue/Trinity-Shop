"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from "@/components/ui/responsiveDialog";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Produit que le visiteur voulait ajouter, rappelé dans le message
  productName?: string;
}

// Connexion demandée avant d'ajouter au panier : panneau en bas de l'écran sur mobile, fenêtre au
// centre sur ordinateur. Après connexion ou inscription, le client revient sur la page où il était.
export default function LoginModal({ isOpen, onClose, productName }: LoginModalProps) {
  const [back, setBack] = useState("/");

  useEffect(() => {
    if (isOpen) setBack(`${window.location.pathname}${window.location.search}`);
  }, [isOpen]);

  const callback = `?callbackUrl=${encodeURIComponent(back)}`;

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveDialogContent className="gap-0 p-0 md:max-w-[420px] md:rounded-3xl">
        <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 md:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
            <Image src="/assets/trinity-logo.png" alt="" width={26} height={26} />
          </span>
          <ResponsiveDialogTitle className="mt-4 text-left text-2xl font-black leading-tight tracking-tight">
            {productName ? "Connectez-vous pour ajouter ce produit" : "Connectez-vous pour continuer"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="mt-2 text-left text-sm leading-relaxed text-muted-foreground">
            {productName
              ? `« ${productName} » vous attendra dans votre panier, gardé sur votre compte jusqu'à votre commande.`
              : "Votre compte garde votre panier, vos favoris et vos points Carte Trinity, sur tous vos appareils."}
          </ResponsiveDialogDescription>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/auth/signin${callback}`}
              onClick={onClose}
              className="flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
            >
              Se connecter
            </Link>
            <Link
              href={`/auth${callback}`}
              onClick={onClose}
              className="flex h-12 items-center justify-center rounded-full border-2 border-primary px-6 text-base font-bold text-primary transition-colors hover:bg-secondary"
            >
              Créer un compte
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Vous reviendrez ensuite sur cette page.</p>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
