"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

// Les images OpenFoodFacts sont copiées dans public/products/<code-barres>.jpg ;
// le code-barres se lit dans le chemin de l'URL d'origine (/images/products/336/895/302/2997/…)
function localImageFor(src: string) {
  const match = src.match(/openfoodfacts\.org\/images\/products\/([\d/]+)\/[^/]+$/);
  return match ? `/products/${match[1].replace(/\//g, "")}.jpg` : null;
}

// Image produit : copie locale d'abord, puis OpenFoodFacts, puis pictogramme de repli
export default function ProductImage({ src, alt, sizes, priority, className }: ProductImageProps) {
  const local = localImageFor(src);
  const candidates = local ? [local, src] : [src];
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
      // Les copies locales font déjà 400 px : servies telles quelles, sans passer par l'optimiseur
      unoptimized={current === local}
      onError={() => setAttempt((value) => value + 1)}
      className={cn("object-contain", className)}
    />
  );
}
