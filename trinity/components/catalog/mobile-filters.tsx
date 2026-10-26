"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsiveDialog";

interface MobileFiltersProps {
  activeCount: number;
  children: React.ReactNode;
}

// Tiroir de filtres sur mobile ; se ferme dès qu'un filtre change l'URL
export default function MobileFilters({ activeCount, children }: MobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setOpen(false);
  }, [searchParams]);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-full border bg-white px-4 text-sm font-bold lg:hidden"
        >
          <SlidersHorizontal size={16} className="text-primary" />
          Filtrer
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-white">
              {activeCount}
            </span>
          )}
        </button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="max-h-[85vh]">
        <ResponsiveDialogHeader className="text-left">
          <ResponsiveDialogTitle className="text-lg font-extrabold">Filtrer les produits</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            Affinez la liste par prix, Nutri-Score ou marque.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="overflow-y-auto px-4 pb-6">{children}</div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
