"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CircleCheck, Loader2, Minus, Plus, ShoppingBasket } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import LoginModal from "@/components/modal/LoginModal";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  size?: "md" | "lg";
  disabled?: boolean;
  className?: string;
}

// Bouton « Ajouter » qui se transforme en sélecteur de quantité une fois le produit au panier
export default function AddToCartButton({
  productId,
  productName,
  size = "md",
  disabled,
  className,
}: AddToCartButtonProps) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { cartProducts, addProductToCart, handleUpdateProductQuantity } = useCart();

  const quantity = cartProducts.find((p) => p.id === productId)?.quantity ?? 0;
  const large = size === "lg";

  const handleAdd = () => {
    if (!session) {
      setIsLoginModalOpen(true);
      return;
    }

    startTransition(async () => {
      try {
        await addProductToCart(productId, 1);
        toast({
          title: "Ajouté au panier",
          description: (
            <span className="flex items-center gap-2">
              <CircleCheck size={16} className="shrink-0 text-bio" aria-hidden />
              <span className="line-clamp-1">{productName}</span>
            </span>
          ),
          duration: 3000,
          className: "rounded-2xl border-l-4 border-l-primary p-4 pr-8",
          action: (
            <ToastAction altText="Voir mon panier" asChild>
              <Link href="/cart" className="shrink-0 rounded-full border-primary px-3 font-bold text-primary">
                Voir le panier
              </Link>
            </ToastAction>
          ),
        });
      } catch (error) {
        console.error("Erreur lors de l'ajout au panier :", error);
      }
    });
  };

  const changeQuantity = (next: number) => {
    startTransition(async () => {
      await handleUpdateProductQuantity(productId, next);
    });
  };

  const height = large ? "h-12" : "h-10";
  const stepButton = cn(
    "flex items-center justify-center rounded-full transition-colors hover:bg-brand-dark",
    height,
    large ? "w-12" : "w-9"
  );

  return (
    <>
      {quantity === 0 ? (
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || disabled}
          aria-label={`Ajouter ${productName} au panier`}
          className={cn(
            "flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50",
            height,
            large ? "text-base" : "text-sm",
            className
          )}
        >
          {isPending ? (
            <Loader2 size={large ? 20 : 18} className="animate-spin" />
          ) : (
            <ShoppingBasket size={large ? 20 : 18} />
          )}
          <span>{large ? "Ajouter au panier" : "Ajouter"}</span>
        </button>
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-between rounded-full bg-primary text-primary-foreground",
            height,
            className
          )}
        >
          <button
            type="button"
            onClick={() => changeQuantity(quantity - 1)}
            disabled={isPending}
            aria-label="Retirer un article"
            className={stepButton}
          >
            <Minus size={large ? 18 : 16} />
          </button>
          <span
            className={cn("min-w-[1.5rem] text-center font-bold tabular-nums", large ? "text-base" : "text-sm")}
            aria-live="polite"
          >
            {isPending ? <Loader2 size={14} className="mx-auto animate-spin" /> : quantity}
          </span>
          <button
            type="button"
            onClick={() => changeQuantity(quantity + 1)}
            disabled={isPending}
            aria-label="Ajouter un article"
            className={stepButton}
          >
            <Plus size={large ? 18 : 16} />
          </button>
        </div>
      )}

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}
