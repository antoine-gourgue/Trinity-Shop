"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { DEFAULT_SORT, SORT_OPTIONS, SortValue } from "@/lib/catalog-options";

export default function SortSelect({ value }: { value: SortValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (next === DEFAULT_SORT) params.delete("tri");
    else params.set("tri", next);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <label className="relative flex h-10 items-center gap-2 rounded-full border bg-white pl-3 pr-2 text-sm font-semibold">
      <ArrowUpDown size={16} className="text-primary" aria-hidden />
      <span className="sr-only">Trier par</span>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="h-full cursor-pointer appearance-none bg-transparent pr-5 outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-xs text-muted-foreground">
        ▾
      </span>
    </label>
  );
}
