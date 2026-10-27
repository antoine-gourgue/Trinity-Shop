"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getSession, useSession } from "next-auth/react";
import { CircleCheck, Loader2, Recycle } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import LoginModal from "@/components/modal/LoginModal";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { addAntiGaspiToCart } from "@/lib/server-actions/anti-gaspi-actions";
import { cn } from "@/lib/utils";

interface AddAntiGaspiButtonProps {
  lotId: string;
  productName: string;
  size?: "md" | "lg";
  className?: string;
}

// Ajoute au panier un article à date courte, au prix anti-gaspi
export default function AddAntiGaspiButton({ lotId, productName, size = "md", className }: AddAntiGaspiButtonProps) {
  const { data: session, status } = useSession();
  const { refreshCart } = useCart();
  const [pending, startTransition] = useTransition();
  const [loginOpen, setLoginOpen] = useState(false);
  const large = size === "lg";

  const add = () => {
    startTransition(async () => {
      // Clic juste après l'affichage, session encore en chargement : on la demande au serveur plutôt
      // que d'ouvrir la fenêtre de connexion à un client connecté
      const signedIn = status === "loading" ? !!(await getSession()) : !!session;
      if (!signedIn) {
        setLoginOpen(true);
        return;
      }
      const result = await addAntiGaspiToCart(lotId);
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      await refreshCart();
      toast({
        title: "Ajouté à prix anti-gaspi",
        description: (
          <span className="flex items-center gap-2">
            <CircleCheck size={16} className="shrink-0 text-bio" aria-hidden />
            <span className="line-clamp-1">{productName}</span>
          </span>
        ),
        duration: 3000,
        className: "rounded-2xl border-l-4 border-l-bio p-4 pr-8",
        action: (
          <ToastAction altText="Voir mon panier" asChild>
            <Link href="/cart" className="shrink-0 rounded-full border-primary px-3 font-bold text-primary">
              Voir le panier
            </Link>
          </ToastAction>
        ),
      });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={add}
        disabled={pending}
        aria-label={`Ajouter ${productName} au panier à prix anti-gaspi`}
        className={cn(
          "flex shrink-0 items-center justify-center gap-2 rounded-full bg-bio px-4 font-bold text-white transition-colors hover:bg-bio/90 disabled:opacity-60",
          large ? "h-12 text-base" : "h-10 text-sm",
          className
        )}
      >
        {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Recycle size={18} aria-hidden />}
        {large ? "Ajouter à prix anti-gaspi" : "Ajouter"}
      </button>
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} productName={productName} />
    </>
  );
}
