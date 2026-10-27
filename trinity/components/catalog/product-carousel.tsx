"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductCarouselProps {
  children: React.ReactNode;
  label: string;
  // Carrousel d'autre chose que des produits (bannières) : libellés et hauteur des flèches
  previousLabel?: string;
  nextLabel?: string;
  arrowTop?: string;
}

// Défilement horizontal natif (scroll-snap) ; les flèches ne servent qu'au desktop
export default function ProductCarousel({
  children,
  label,
  previousLabel = `${label} : produits précédents`,
  nextLabel = `${label} : produits suivants`,
  arrowTop = "top-[38%]",
}: ProductCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: "smooth" });
  };

  const arrowClass = `absolute ${arrowTop} z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-brand-dark shadow-md transition hover:bg-primary hover:text-white md:flex`;

  return (
    <div className="relative">
      <button type="button" onClick={() => scroll(-1)} aria-label={previousLabel} className={`${arrowClass} -left-4`}>
        <ChevronLeft size={20} />
      </button>
      <ul
        ref={trackRef}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:gap-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      <button type="button" onClick={() => scroll(1)} aria-label={nextLabel} className={`${arrowClass} -right-4`}>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
