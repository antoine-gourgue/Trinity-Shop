"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LayoutGrid, Loader2, Search } from "lucide-react";
import ProductImage from "@/components/product/product-image";
import { getSearchSuggestions, type SearchSuggestions } from "@/lib/server-actions/search-actions";
import { formatBrand, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SearchProductProps {
  onSearch?: () => void;
  setOpenSearch?: Dispatch<SetStateAction<boolean>>;
  className?: string;
  autoFocus?: boolean;
}

const MIN_LENGTH = 2;

// Barre de recherche avec suggestions (rayons et produits) pendant la frappe
const SearchProduct: React.FC<SearchProductProps> = ({ onSearch, setOpenSearch, className, autoFocus }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const container = useRef<HTMLDivElement>(null);
  const lastRequest = useRef(0);

  const query = search.trim();

  // Suggestions après une courte pause dans la frappe ; seule la dernière réponse compte
  useEffect(() => {
    if (query.length < MIN_LENGTH) {
      setSuggestions(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const request = ++lastRequest.current;
    const timer = setTimeout(() => {
      getSearchSuggestions(query)
        .then((result) => {
          if (request === lastRequest.current) setSuggestions(result);
        })
        .catch(() => undefined)
        .finally(() => {
          if (request === lastRequest.current) setLoading(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = [
    ...(suggestions?.rayons.map((rayon) => rayon.href) ?? []),
    ...(suggestions?.products.map((product) => `/product/${product.id}`) ?? []),
  ];

  const finish = () => {
    setOpen(false);
    setHighlight(-1);
    setOpenSearch?.(false);
    onSearch?.();
  };

  const go = (href: string) => {
    router.push(href);
    finish();
  };

  const submit = () => go(query ? `/produits?q=${encodeURIComponent(query)}` : "/produits");

  const showPanel = open && query.length >= MIN_LENGTH && (suggestions !== null || loading);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      // Liste ouverte : Échap la ferme sans vider le champ (comportement natif d'un champ de recherche)
      if (showPanel) event.preventDefault();
      setOpen(false);
      setHighlight(-1);
      return;
    }
    if (!open || items.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => (index <= 0 ? items.length - 1 : index - 1));
    }
  };

  let itemIndex = -1;

  return (
    <div ref={container} className="relative w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (highlight >= 0 && items[highlight]) go(items[highlight]);
          else submit();
        }}
        className={cn(
          "flex h-11 w-full items-center rounded-full border border-input bg-muted pl-4 pr-1 transition-colors focus-within:border-primary focus-within:bg-white",
          className
        )}
      >
        {loading ? (
          <Loader2 size={18} className="shrink-0 animate-spin text-primary" aria-hidden />
        ) : (
          <Search size={18} className="shrink-0 text-muted-foreground" aria-hidden />
        )}
        <input
          type="search"
          name="q"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Rechercher un produit, une marque…"
          aria-label="Rechercher un produit"
          aria-expanded={showPanel}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          role="combobox"
          autoComplete="off"
          autoFocus={autoFocus}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          className="hidden h-9 shrink-0 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark lg:block"
        >
          Rechercher
        </button>
      </form>

      {showPanel && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border bg-white p-2 shadow-xl"
        >
          {suggestions && suggestions.rayons.length > 0 && (
            <div className="pb-2">
              <p className="px-3 pb-1 pt-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Rayons</p>
              {suggestions.rayons.map((rayon) => {
                itemIndex += 1;
                const active = itemIndex === highlight;
                return (
                  <Link
                    key={rayon.href}
                    href={rayon.href}
                    onClick={finish}
                    role="option"
                    aria-selected={active}
                    className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", active ? "bg-secondary" : "hover:bg-muted")}
                  >
                    <LayoutGrid size={16} className="shrink-0 text-primary" aria-hidden />
                    <span className="font-semibold">{rayon.label}</span>
                    {rayon.parent && <span className="text-xs text-muted-foreground">dans {rayon.parent}</span>}
                  </Link>
                );
              })}
            </div>
          )}

          {suggestions && suggestions.products.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Produits</p>
              {suggestions.products.map((product) => {
                itemIndex += 1;
                const active = itemIndex === highlight;
                const promo = product.regularPrice !== null && product.regularPrice > product.price;
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    onClick={finish}
                    role="option"
                    aria-selected={active}
                    className={cn("flex items-center gap-3 rounded-xl px-3 py-2", active ? "bg-secondary" : "hover:bg-muted")}
                  >
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-white">
                      <ProductImage src={product.picture} alt="" sizes="40px" className="p-0.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{product.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatBrand(product.brand)}
                        {product.netContent && ` · ${product.netContent}`}
                      </span>
                    </span>
                    <span className={cn("shrink-0 text-sm font-black tabular-nums", promo && "text-promo")}>
                      {formatPrice(product.price)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {suggestions && suggestions.total === 0 && suggestions.rayons.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">Aucun produit pour « {query} ».</p>
          )}

          {suggestions && suggestions.total > 0 && (
            <button
              type="button"
              onClick={submit}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-secondary"
            >
              Voir les {suggestions.total} résultat{suggestions.total > 1 ? "s" : ""} pour « {query} »
              <ArrowRight size={16} aria-hidden />
            </button>
          )}

          {!suggestions && loading && <p className="px-3 py-4 text-sm text-muted-foreground">Recherche…</p>}
        </div>
      )}
    </div>
  );
};

export default SearchProduct;
