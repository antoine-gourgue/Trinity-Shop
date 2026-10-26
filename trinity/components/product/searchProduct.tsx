"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchProductProps {
  onSearch?: () => void;
  setOpenSearch?: Dispatch<SetStateAction<boolean>>;
  className?: string;
  autoFocus?: boolean;
}

const SearchProduct: React.FC<SearchProductProps> = ({
  onSearch,
  setOpenSearch,
  className,
  autoFocus,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = search.trim();
    router.push(query ? `/produits?q=${encodeURIComponent(query)}` : "/produits");

    setOpenSearch?.(false);
    onSearch?.();
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        "flex h-11 w-full items-center rounded-full border border-input bg-muted pl-4 pr-1 transition-colors focus-within:border-primary focus-within:bg-white",
        className
      )}
    >
      <Search size={18} className="shrink-0 text-muted-foreground" aria-hidden />
      <input
        type="search"
        name="q"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un produit, une marque…"
        aria-label="Rechercher un produit"
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
  );
};

export default SearchProduct;
