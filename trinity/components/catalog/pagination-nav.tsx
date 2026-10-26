import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ListingParams, listingHref } from "@/lib/catalog-options";
import { cn } from "@/lib/utils";

interface PaginationNavProps {
  basePath: string;
  params: ListingParams;
  page: number;
  pageCount: number;
}

// Pages affichées : la première, la dernière et deux voisines de la page courante
function visiblePages(page: number, pageCount: number) {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  return [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
}

export default function PaginationNav({ basePath, params, page, pageCount }: PaginationNavProps) {
  if (pageCount <= 1) return null;

  const pages = visiblePages(page, pageCount);
  const hrefFor = (target: number) => listingHref(basePath, params, { page: target });
  const arrowClass =
    "flex h-10 items-center gap-1 rounded-full border bg-white px-3 text-sm font-bold transition-colors hover:border-primary hover:text-primary";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={arrowClass} rel="prev">
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Précédent</span>
        </Link>
      ) : (
        <span className={cn(arrowClass, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Précédent</span>
        </span>
      )}

      <ol className="flex items-center gap-1">
        {pages.map((p, index) => (
          <li key={p} className="flex items-center gap-1">
            {index > 0 && p - pages[index - 1] > 1 && (
              <span className="px-1 text-muted-foreground" aria-hidden>
                …
              </span>
            )}
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
              className={cn(
                "flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-bold transition-colors",
                p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary hover:text-primary"
              )}
            >
              {p}
            </Link>
          </li>
        ))}
      </ol>

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={arrowClass} rel="next">
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className={cn(arrowClass, "pointer-events-none opacity-40")} aria-hidden>
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
