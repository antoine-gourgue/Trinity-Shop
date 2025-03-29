"use client";

import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { PlaceholdersAndVanishInput } from "../ui/placeholders-and-vanish-input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SearchProductProps {
  onSearch?: () => void;
  setOpenSearch?: Dispatch<SetStateAction<boolean>>;
}

const SearchProduct: React.FC<SearchProductProps> = ({
  onSearch,
  setOpenSearch,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get("product") || "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push("/?" + createQueryString("product", search));

    setOpenSearch?.(false);

    if (onSearch) {
      onSearch();
    }
  };

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  return (
    <PlaceholdersAndVanishInput
      placeholders={["Pâtes", "Riz", "Poisson"]}
      onChange={handleChange}
      onSubmit={handleSubmit}
      initalValue={search}
    />
  );
};

export default SearchProduct;
