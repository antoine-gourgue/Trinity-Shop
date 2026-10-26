import { ChevronDown } from "lucide-react";
import type { ProductListing } from "@/lib/catalog";
import { GAMMES, ListingParams, NutriGrade, PRICE_RANGES, listingHref, toggleValue } from "@/lib/catalog-options";
import { cn } from "@/lib/utils";
import { FilterOption } from "@/components/catalog/filter-option";
import BrandFacet from "@/components/catalog/brand-facet";

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
  facets: ProductListing["facets"];
}

// Filtres sous forme de liens : fonctionnent sans JavaScript et restent partageables
export default function ListingFilters({ basePath, params, facets }: ListingFiltersProps) {
  const activeNutri = params.nutriscores.length > 0;

  return (
    <div className="divide-y rounded-2xl border bg-white">
      <FilterGroup title="Offres et labels" active={params.promo || params.bio}>
        <FilterOption
          href={listingHref(basePath, params, { promo: !params.promo })}
          active={params.promo}
          count={facets.promoCount}
          disabled={!params.promo && facets.promoCount === 0}
        >
          <span className="rounded-md bg-promo px-1.5 py-0.5 text-[11px] font-black text-white">%</span>
          En promotion
        </FilterOption>
        <FilterOption
          href={listingHref(basePath, params, { bio: !params.bio })}
          active={params.bio}
          count={facets.bioCount}
          disabled={!params.bio && facets.bioCount === 0}
        >
          <span className="rounded-md bg-bio px-1.5 py-0.5 text-[11px] font-black text-white">BIO</span>
          Bio
        </FilterOption>
      </FilterGroup>

      <FilterGroup title="Prix" active={!!params.prix}>
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

      <FilterGroup title="Nutri-Score" active={activeNutri}>
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
        <FilterGroup title="Marques" active={!!params.gamme || params.marques.length > 0} list={false}>
          <ul className="mb-2 space-y-0.5 border-b pb-2">
            {GAMMES.map((gamme) => {
              const active = params.gamme === gamme.value;
              const count = facets.gammes[gamme.value];
              return (
                <FilterOption
                  key={gamme.value}
                  href={listingHref(basePath, params, { gamme: active ? undefined : gamme.value })}
                  active={active}
                  count={count}
                  disabled={!active && count === 0}
                  shape="radio"
                >
                  {gamme.label}
                </FilterOption>
              );
            })}
          </ul>
          <BrandFacet
            options={facets.brands.map((facet) => ({
              ...facet,
              active: params.marques.includes(facet.value),
              href: listingHref(basePath, params, { marques: toggleValue(params.marques, facet.value) }),
            }))}
          />
        </FilterGroup>
      )}
    </div>
  );
}

// Groupe repliable ; ouvert par défaut, avec un repère quand un de ses filtres est actif
function FilterGroup({
  title,
  active,
  list = true,
  children,
}: {
  title: string;
  active: boolean;
  list?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open className="group p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-brand-dark">
          {title}
          {active && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Filtre actif" />}
        </h2>
        <ChevronDown size={18} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-2">{list ? <ul className="space-y-0.5">{children}</ul> : children}</div>
    </details>
  );
}
