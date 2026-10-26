"use client";

import { useEffect, useState } from "react";
import Price from "@/components/product/price";
import ProductImage from "@/components/product/product-image";
import AddToCartButton from "@/components/product/add-to-cart-button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProductStickyBarProps {
  productId: string;
  name: string;
  picture: string;
  price: number;
  regularPrice?: number | null;
  unitPrice?: string | null;
  disabled?: boolean;
  // Élément de référence : la barre apparaît une fois qu'il est sorti de l'écran
  triggerId: string;
  sections: { id: string; label: string }[];
}

// Barre produit qui suit le défilement (vignette, sections, prix et ajout au panier)
export default function ProductStickyBar({
  productId,
  name,
  picture,
  price,
  regularPrice,
  unitPrice,
  disabled,
  triggerId,
  sections,
}: ProductStickyBarProps) {
  const [visible, setVisible] = useState(false);
  const [top, setTop] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const headerBottom = document.querySelector("[data-sticky-header]")?.getBoundingClientRect().bottom ?? 0;
      const trigger = document.getElementById(triggerId);
      setTop(Math.max(0, headerBottom));
      setVisible(!!trigger && trigger.getBoundingClientRect().bottom < headerBottom);

      // Section courante : celle dont le haut est passé sous la barre le plus récemment
      // (la plus basse parmi celles déjà atteintes), quel que soit l'ordre des liens
      const threshold = Math.max(headerBottom + 140, 240);
      let current: string | null = null;
      let currentTop = -Infinity;
      for (const section of sections) {
        const top = document.getElementById(section.id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= threshold && top > currentTop) {
          current = section.id;
          currentTop = top;
        }
      }
      setActiveSection(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [triggerId, sections]);

  return (
    <div
      style={{ top }}
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 z-30 transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
      )}
    >
      <div className="mx-auto max-w-[1400px] px-2 md:px-6">
        <div className="flex items-center gap-3 rounded-b-3xl border border-t-0 bg-white px-3 py-2 shadow-lg md:gap-5 md:px-5 md:py-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white md:h-16 md:w-16">
            <ProductImage src={picture} alt="" sizes="64px" className="p-1" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold md:text-base">{name}</p>
            <nav aria-label="Sections de la fiche produit" className="mt-1 hidden lg:block">
              <ul className="flex gap-5 xl:gap-7">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                      }}
                      tabIndex={visible ? undefined : -1}
                      className={cn(
                        "whitespace-nowrap text-sm underline-offset-4 transition-colors hover:text-primary hover:underline",
                        activeSection === section.id ? "font-extrabold text-foreground underline" : "text-muted-foreground"
                      )}
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-3 md:gap-5 md:border-l md:pl-5">
            <div className="flex flex-col items-end">
              {regularPrice && regularPrice > price && (
                <span className="hidden text-xs text-muted-foreground line-through sm:block">
                  {formatPrice(regularPrice)}
                </span>
              )}
              <span className="flex items-end gap-2">
                <span className="relative">
                  <Price
                    value={price}
                    size="md"
                    className={cn("relative z-10", regularPrice && regularPrice > price && "text-promo")}
                  />
                  <span aria-hidden className="absolute -bottom-1 left-0 right-0 h-1.5 rounded-full bg-highlight" />
                </span>
                {unitPrice && <span className="hidden text-xs text-muted-foreground lg:inline">{unitPrice}</span>}
              </span>
            </div>
            <AddToCartButton productId={productId} productName={name} disabled={disabled} className="md:h-12 md:px-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
