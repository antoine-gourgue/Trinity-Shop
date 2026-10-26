"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { activateLoyaltyCard } from "@/lib/server-actions/loyalty-actions";
import { cn } from "@/lib/utils";

export default function ActivateCardButton({
  className,
  variant = "primary",
  onActivated,
}: {
  className?: string;
  // « light » : bouton blanc pour les fonds sombres
  variant?: "primary" | "light";
  onActivated?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activate = () => {
    setError(null);
    startTransition(async () => {
      const result = await activateLoyaltyCard();
      if ("error" in result && result.error) setError(result.error);
      else {
        onActivated?.();
        router.refresh();
      }
    });
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={activate}
        disabled={isPending}
        className={cn(
          "flex h-12 items-center justify-center gap-2 rounded-full px-6 font-bold transition-colors disabled:opacity-60",
          variant === "light"
            ? "bg-white text-brand-dark hover:bg-highlight"
            : "bg-primary text-primary-foreground hover:bg-brand-dark"
        )}
      >
        {isPending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Sparkles size={18} aria-hidden />}
        Activer ma Carte Trinity
      </button>
      {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}
