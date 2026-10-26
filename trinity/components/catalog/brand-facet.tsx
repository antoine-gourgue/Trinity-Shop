"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { FilterOption } from "@/components/catalog/filter-option";

export interface BrandOption {
  value: string;
  label: string;
  count: number;
  href: string;
  active: boolean;
}

// Au-delà, la liste est repliée ; au-delà de SEARCH_FROM marques, une recherche apparaît
const VISIBLE = 6;
const SEARCH_FROM = 10;

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Marques d'une liste : les principales d'abord, les marques cochées toujours visibles
export default function BrandFacet({ options }: { options: BrandOption[] }) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

  const searching = query.trim().length > 0;
  const matches = searching ? options.filter((option) => fold(option.label).includes(fold(query.trim()))) : options;
  const visible = searching || expanded ? matches : [...options.slice(0, VISIBLE), ...options.slice(VISIBLE).filter((o) => o.active)];
  const hidden = options.length - visible.length;

  return (
    <div>
      {options.length > SEARCH_FROM && (
        <label className="mb-2 flex h-9 items-center gap-2 rounded-full border bg-white px-3 focus-within:border-primary">
          <Search size={14} className="shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">Rechercher une marque</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une marque"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      )}

      <ul className="space-y-0.5">
        {visible.map((option) => (
          <FilterOption key={option.value} href={option.href} active={option.active} count={option.count}>
            {option.label}
          </FilterOption>
        ))}
        {searching && matches.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">Aucune marque trouvée.</li>}
      </ul>

      {!searching && options.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-1 flex items-center gap-1 px-2 py-1 text-sm font-bold text-primary hover:underline"
        >
          {expanded ? "Voir moins" : `Voir les ${hidden} autres`}
          <ChevronDown size={16} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden />
        </button>
      )}
    </div>
  );
}
