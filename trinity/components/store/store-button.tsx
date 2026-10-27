"use client";

import { MapPin } from "lucide-react";
import { useStoreChoice } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";

interface StoreButtonProps {
  // Bandeau foncé du haut de page (ordinateur et mobile), ou lien dans une page claire
  variant: "bar" | "link";
  className?: string;
}

// Magasin du visiteur, et accès au changement de magasin
export default function StoreButton({ variant, className }: StoreButtonProps) {
  const { store, openStorePicker } = useStoreChoice();

  if (variant === "link") {
    return (
      <button type="button" onClick={openStorePicker} className={cn("font-bold text-primary underline-offset-2 hover:underline", className)}>
        {store ? "Changer de magasin" : "Choisir mon magasin"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openStorePicker}
      className={cn("flex min-w-0 items-center gap-1.5 text-left font-bold text-white transition-colors hover:text-highlight", className)}
    >
      <MapPin size={14} className="shrink-0 text-highlight" aria-hidden />
      <span className="truncate">{store ? store.name : "Choisissez votre magasin"}</span>
      <span className="shrink-0 font-normal text-white/70 underline underline-offset-2">{store ? "Changer" : "Choisir"}</span>
    </button>
  );
}
