"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";
import { localImageFor } from "@/lib/product-images";

interface ProductImageProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  // Produit hors catalogue (scanné) : il n'a pas de copie locale à essayer
  remote?: boolean;
  className?: string;
}

// Image produit : copie locale d'abord, puis OpenFoodFacts, puis pictogramme de repli
// (aussi affiché d'emblée pour un produit créé sans photo)
export default function ProductImage({ src, alt, sizes, priority, remote, className }: ProductImageProps) {
  const local = remote ? null : localImageFor(src);
  const candidates = local ? [local, src] : src ? [src] : [];
  const [attempt, setAttempt] = useState(0);

  if (attempt >= candidates.length) {
    return (
      <span className="flex h-full w-full items-center justify-center rounded-lg bg-muted text-muted-foreground/50">
        <ShoppingBasket className="h-1/3 w-1/3" aria-hidden />
        <span className="sr-only">{alt}</span>
      </span>
    );
  }

  const current = candidates[attempt];

  return (
    <Image
      key={current}
      src={current}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      // Les copies locales font déjà 400 px : servies telles quelles, sans passer par l'optimiseur.
      // Les photos d'un produit scanné aussi : l'optimiseur abandonne quand Open Food Facts est lent.
      unoptimized={current === local || remote}
      onError={() => setAttempt((value) => value + 1)}
      className={cn("object-contain", className)}
    />
  );
}
