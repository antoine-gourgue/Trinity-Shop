"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { switchFavorite, useFavorites } from "@/lib/favorites-store";
import { cn } from "@/lib/utils";

// Cœur « ajouter aux favoris » ; sans session, il mène à la connexion
export default function FavoriteButton({ productId, className }: { productId: string; className?: string }) {
  const favorites = useFavorites();
  const active = favorites.has(productId);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const result = await switchFavorite(productId);
      if (!result.ok && result.error === "login") {
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={active}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 shadow-sm backdrop-blur transition-colors hover:border-promo",
        active ? "text-promo" : "text-muted-foreground hover:text-promo",
        className
      )}
    >
      <Heart size={18} fill={active ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}
