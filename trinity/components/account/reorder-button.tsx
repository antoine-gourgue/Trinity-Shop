"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, RotateCcw } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import { reorder, type ReorderResult } from "@/lib/server-actions/reorder-actions";

// Remet les articles d'une commande passée dans le panier
export default function ReorderButton({ orderId }: { orderId: string }) {
  const { refreshCart } = useCart();
  const [result, setResult] = useState<ReorderResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const outcome = await reorder(orderId);
      if (outcome.ok) await refreshCart();
      setResult(outcome);
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <RotateCcw size={16} aria-hidden />}
        Racheter cette commande
      </button>

      {result && (
        <div role="status" className="mt-2 text-center text-xs">
          {!result.ok ? (
            <p className="font-semibold text-destructive">{result.error}</p>
          ) : (
            <>
              <p className="font-semibold">
                {result.added > 0
                  ? `${result.added} article${result.added > 1 ? "s" : ""} ajouté${result.added > 1 ? "s" : ""} au panier.`
                  : "Aucun article n’a pu être ajouté."}{" "}
                {result.added > 0 && (
                  <Link href="/cart" className="font-bold text-primary hover:underline">
                    Voir mon panier
                  </Link>
                )}
              </p>
              {result.skipped.length > 0 && (
                <p className="mt-1 text-muted-foreground">Indisponible : {result.skipped.join(", ")}.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
