import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import SubcategoryIcon from "@/components/catalog/subcategory-icon";

export interface Crumb {
  label: string;
  href?: string;
}

export interface HeaderChip {
  label: string;
  href: string;
  active: boolean;
  count?: number;
}

interface ListingHeaderProps {
  title: string;
  description?: string;
  image?: string;
  icon?: string;
  breadcrumb: Crumb[];
  chips?: HeaderChip[];
}

// Bandeau de tête des listes : fil d'Ariane, titre et sous-rayons en pastilles
export default function ListingHeader({ title, description, image, icon, breadcrumb, chips }: ListingHeaderProps) {
  return (
    <header className="overflow-hidden rounded-2xl bg-brand-dark text-white">
      <div className="px-5 pb-5 pt-4 md:px-8 md:pb-6">
        <nav aria-label="Fil d'Ariane">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-white/70">
            {breadcrumb.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {index > 0 && <ChevronRight size={12} aria-hidden />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-white hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-semibold text-white">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-4 flex items-center gap-4">
          {icon ? (
            <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-primary sm:flex">
              <SubcategoryIcon name={icon} size={32} strokeWidth={1.75} />
            </span>
          ) : (
            image && (
              <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white sm:flex">
                <Image src={image} alt="" width={44} height={44} className="h-11 w-auto object-contain" />
              </span>
            )
          )}
          <div>
            <h1 className="text-2xl font-black leading-tight md:text-3xl">{title}</h1>
            {description && <p className="mt-1 text-sm text-white/75">{description}</p>}
          </div>
        </div>
      </div>

      {chips && chips.length > 0 && (
        <nav aria-label="Sous-rayons" className="border-t border-white/10 bg-black/10">
          <ul className="flex gap-2 overflow-x-auto px-5 py-3 md:flex-wrap md:px-8">
            {chips.map((chip) => (
              <li key={chip.href} className="shrink-0">
                <Link
                  href={chip.href}
                  aria-current={chip.active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-bold transition-colors",
                    chip.active
                      ? "border-white bg-white text-brand-dark"
                      : "border-white/30 text-white hover:border-white hover:bg-white/10"
                  )}
                >
                  {chip.label}
                  {chip.count !== undefined && (
                    <span className={cn("text-xs font-semibold", chip.active ? "text-primary" : "text-white/60")}>
                      {chip.count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
