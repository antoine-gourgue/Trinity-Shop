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

// Image produit OpenFoodFacts avec un pictogramme de repli si elle ne se charge pas
export default function ProductImage({ src, alt, sizes, priority, className }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center rounded-lg bg-muted text-muted-foreground/50">
        <ShoppingBasket className="h-1/3 w-1/3" aria-hidden />
        <span className="sr-only">{alt}</span>
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
    />
  );
}
