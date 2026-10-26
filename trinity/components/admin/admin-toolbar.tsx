"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Barre d'outils d'une liste : recherche (mise dans l'URL) et onglets de filtre avec leurs compteurs

export function AdminSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      const query = params.toString();
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="flex h-11 w-full items-center gap-2 rounded-full border bg-white px-4 transition-colors focus-within:border-primary sm:max-w-sm">
      {isPending ? (
        <Loader2 size={18} className="shrink-0 animate-spin text-primary" aria-hidden />
      ) : (
        <Search size={18} className="shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className="sr-only">Rechercher</span>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => setValue("")} aria-label="Effacer la recherche" className="text-muted-foreground hover:text-foreground">
          <X size={16} aria-hidden />
        </button>
      )}
    </label>
  );
}

export function AdminFilterTabs({
  filters,
  active,
  counts,
  param = "filtre",
}: {
  filters: readonly { value: string; label: string }[];
  active: string;
  counts?: Record<string, number>;
  param?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value === "tous") params.delete(param);
    else params.set(param, value);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <nav aria-label="Filtres" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {filters.map((filter) => {
        const selected = filter.value === active;
        return (
          <Link
            key={filter.value}
            href={hrefFor(filter.value)}
            scroll={false}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
              selected ? "border-primary bg-primary text-primary-foreground" : "bg-white text-foreground hover:border-primary hover:text-primary"
            )}
          >
            {filter.label}
            {counts && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  selected ? "bg-white/20" : "bg-muted text-muted-foreground"
                )}
              >
                {counts[filter.value] ?? 0}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSelectFilter({
  label,
  param,
  options,
  value,
}: {
  label: string;
  param: string;
  options: { value: string; label: string }[];
  value?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="relative flex h-11 items-center rounded-full border bg-white pl-4 pr-3 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("page");
          if (event.target.value) params.set(param, event.target.value);
          else params.delete(param);
          const query = params.toString();
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }}
        className="h-full cursor-pointer appearance-none bg-transparent pr-6 outline-none"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-4 text-xs text-muted-foreground">
        ▾
      </span>
    </label>
  );
}
