import Link from "next/link";
import { Check } from "lucide-react";
import type { FacetOption } from "@/lib/catalog";
import {
  ListingParams,
  NutriGrade,
  PRICE_RANGES,
  listingHref,
  toggleValue,
} from "@/lib/catalog-options";
import { cn } from "@/lib/utils";

const NUTRI_COLORS: Record<string, string> = {
  A: "bg-[#038141]",
  B: "bg-[#85BB2F]",
  C: "bg-[#FECB02] text-foreground",
  D: "bg-[#EE8100]",
  E: "bg-[#E63E11]",
};

interface ListingFiltersProps {
  basePath: string;
  params: ListingParams;
  facets: { brands: FacetOption[]; nutriScores: FacetOption[] };
}

// Filtres sous forme de liens : fonctionnent sans JavaScript et restent partageables
export default function ListingFilters({ basePath, params, facets }: ListingFiltersProps) {
  return (
    <div className="divide-y rounded-2xl border bg-white">
      <FilterGroup title="Prix">
        {PRICE_RANGES.map((range) => {
          const active = params.prix === range.value;
          return (
            <FilterOption
              key={range.value}
              href={listingHref(basePath, params, { prix: active ? undefined : range.value })}
              active={active}
              shape="radio"
            >
              {range.label}
            </FilterOption>
          );
        })}
      </FilterGroup>

      <FilterGroup title="Nutri-Score">
        {facets.nutriScores.map((facet) => {
          const grade = facet.value as NutriGrade;
          const active = params.nutriscores.includes(grade);
          return (
            <FilterOption
              key={grade}
              href={listingHref(basePath, params, { nutriscores: toggleValue(params.nutriscores, grade) })}
              active={active}
              count={facet.count}
              disabled={!active && facet.count === 0}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white",
                  NUTRI_COLORS[grade]
                )}
              >
                {grade}
              </span>
              Nutri-Score {grade}
            </FilterOption>
          );
        })}
      </FilterGroup>

      {facets.brands.length > 0 && (
        <FilterGroup title="Marques">
          {facets.brands.map((facet) => {
            const active = params.marques.includes(facet.value);
            return (
              <FilterOption
                key={facet.value}
                href={listingHref(basePath, params, { marques: toggleValue(params.marques, facet.value) })}
                active={active}
                count={facet.count}
              >
                {facet.label}
              </FilterOption>
            );
          })}
        </FilterGroup>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-4">
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-brand-dark">{title}</h2>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

function FilterOption({
  href,
  active,
  count,
  disabled,
  shape = "checkbox",
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  disabled?: boolean;
  shape?: "checkbox" | "radio";
  children: React.ReactNode;
}) {
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors",
          shape === "radio" ? "rounded-full" : "rounded-md",
          active ? "border-primary bg-primary text-white" : "border-input bg-white"
        )}
      >
        {active && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="flex flex-1 items-center gap-2">{children}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
    </>
  );

  const className = "flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-semibold";

  if (disabled) {
    return (
      <li>
        <span className={cn(className, "cursor-not-allowed opacity-40")}>{content}</span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={cn(className, "transition-colors hover:bg-muted", active && "text-primary")}
      >
        {content}
      </Link>
    </li>
  );
}
