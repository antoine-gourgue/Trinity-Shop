"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Loader2, ShoppingBasket } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import { addFavoritesToCart } from "@/lib/server-actions/favorite-actions";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

// Résumé de l'ajout : ce qui est arrivé au panier, ce qui y était déjà, ce qui manque
function summary(added: number, alreadyInCart: number, unavailable: number) {
  const parts = [];
  if (alreadyInCart > 0) parts.push(`${plural(alreadyInCart, "produit")} déjà au panier`);
  if (unavailable > 0) parts.push(`${plural(unavailable, "produit")} en rupture`);
  return parts.join(", ") || (added > 0 ? "Un exemplaire de chaque favori." : "");
}

// « Tout ajouter au panier » sur la page des favoris : les courses habituelles en un clic
export default function AddFavoritesToCart() {
  const { refreshCart } = useCart();
  const [isPending, startTransition] = useTransition();

  const addAll = () => {
    startTransition(async () => {
      const result = await addFavoritesToCart();
      if (!result.ok) {
        toast({ variant: "destructive", description: "Connectez-vous pour remplir votre panier." });
        return;
      }
      await refreshCart();
      const { added, alreadyInCart, unavailable } = result;
      toast({
        title: added > 0 ? `${plural(added, "produit")} ajouté${added > 1 ? "s" : ""} au panier` : "Rien à ajouter",
        description: summary(added, alreadyInCart, unavailable),
        duration: 4000,
        className: "rounded-2xl border-l-4 border-l-primary p-4 pr-8",
        action:
          added > 0 ? (
            <ToastAction altText="Voir mon panier" asChild>
              <Link href="/cart" className="shrink-0 rounded-full border-primary px-3 font-bold text-primary">
                Voir le panier
              </Link>
            </ToastAction>
          ) : undefined,
      });
    });
  };

  return (
    <Button onClick={addAll} disabled={isPending} className="rounded-full font-bold">
      {isPending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <ShoppingBasket size={18} aria-hidden />}
      Tout ajouter au panier
    </Button>
  );
}
