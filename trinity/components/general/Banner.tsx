"use client";

import { useState } from "react";
import { X } from "lucide-react";
import SearchProduct from "../product/searchProduct";
import { useIsMobile } from "@/hooks/use-mobile";
import CategoryCarousel from "@/components/category/CategoryCarousel";

export default function Banner() {
    const [showBanner, setShowBanner] = useState(true);
    const isMobile = useIsMobile();

    return (
        <div className="py-10 flex flex-col gap-6">
            <div className="w-full text-center">
                <h1 className="text-left text-2xl sm:text-xl font-semibold text-slate-900 leading-[150%]">
                    Bienvenue au Trinity U <span className="font-bold">Rennes Epitech</span>
                </h1>
            </div>

            {showBanner && (
                <div className="w-full bg-teal-800 text-white px-6 py-4 flex items-center rounded-lg shadow-md mb-4">
                    <img
                        width="25"
                        height="24"
                        className="mr-2"
                        src="/assets/trinity-logo.png"
                        alt="Livraison"
                    />
                    <div className="flex-1">
                        <h2 className="text-lg font-bold">Livraison course Trinity</h2>
                        <p className="text-sm">
                            Commandez en ligne et faites-vous livrer chez vous ou récupérez vos courses en magasin.
                        </p>
                    </div>

                    {/* Croix */}
                    <button
                        className="ml-auto p-2 rounded-full hover:bg-white/20"
                        aria-label="Fermer la bannière"
                        onClick={() => setShowBanner(false)}
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            {isMobile && <SearchProduct />}

            {isMobile &&
                <div className="text-center text-gray-900 text-lg font-semibold mt-4">
                Tentez un tour dans{" "}
                <span className="relative inline-block">
          <span className="relative z-10 font-bold">nos rayons</span>
          <svg
              className="absolute bottom-0 left-0 w-full h-[0.5em] z-0"
              viewBox="0 0 100 15"
              preserveAspectRatio="none"
          >
            <path
                d="M0 10 Q25 5, 50 10 T100 10"
                fill="none"
                stroke="#FFC107"
                strokeWidth="4"
                strokeLinecap="round"
            />
          </svg>
        </span>
            </div>
            }

            {isMobile && (
                <div className="w-full flex justify-center">
                    <CategoryCarousel />
                </div>
            )}
        </div>
    );
}
