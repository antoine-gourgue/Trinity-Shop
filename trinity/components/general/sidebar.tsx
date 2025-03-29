"use client";

import Link from "next/link";
import clsx from "clsx";
import getCategoriesActions from "@/lib/server-actions/get-categories-actions";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { SheetClose } from "../ui/sheet";

interface SidebarProps {
  className?: string;
  setOpen?: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({ className, setOpen }: SidebarProps) {
  const [categoryIds, setCategoryIds] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async function fetchCategories() {
      const dbCategories = await getCategoriesActions();
      setCategoryIds(
        Object.fromEntries(dbCategories.map((c) => [c.name, c.id]))
      );
    }

    fetchCategories();
  }, []);

  const categories = [
    {
      id: "fruits-legumes",
      name: "Fruits et Légumes",
      image: "/categories/fruits_legumes.png",
      subcategories: [
        "Légumes et dérivés",
        "Fruits et produits dérivés",
        "Salades",
        "Fruits secs",
        "Fruits tropicaux",
      ],
    },
    {
      id: "viandes-poissons",
      name: "Viandes et Poissons",
      image: "/categories/viande_poissons.png",
      subcategories: [
        "Viandes",
        "Charcuteries",
        "Jambons",
        "Poissons",
        "Filets de poissons",
        "Poissons surgelés",
        "Saumons",
        "Poissons fumés",
      ],
    },
    {
      id: "charcuterie-traiteur",
      name: "Charcuterie et Traiteur",
      image: "/categories/charcuterie.webp",
      subcategories: [
        "Charcuteries",
        "Jambons",
        "Saucissons",
        "Pâtés",
        "Rillettes",
        "Terrines",
        "Plats préparés à base de charcuterie",
      ],
    },
    {
      id: "produits-frais",
      name: "Produits Frais",
      image: "/categories/produit_frais.png",
      subcategories: [
        "Produits laitiers",
        "Desserts",
        "Fromages",
        "Yaourts",
        "Viandes fraîches",
        "Poissons frais",
      ],
    },
    {
      id: "surgeles",
      name: "Surgelés",
      image: "/categories/surgeles_etoile.png",
      subcategories: [
        "Plats préparés surgelés",
        "Desserts glacés",
        "Poissons surgelés",
        "Viandes surgelées",
        "Viennoiseries surgelées",
      ],
    },
    {
      id: "epicerie-salee",
      name: "Épicerie Salée",
      image: "/categories/epicerie_salee.png",
      subcategories: [
        "Pâtes",
        "Riz",
        "Conserves",
        "Soupes",
        "Plats préparés en conserve",
        "Assaisonnements",
      ],
    },
    {
      id: "epicerie-sucree",
      name: "Épicerie Sucrée",
      image: "/categories/epicerie_sucree.png",
      subcategories: [
        "Biscuits",
        "Chocolats",
        "Confiseries",
        "Bonbons",
        "Céréales",
        "Miel",
        "Confitures",
      ],
    },
    {
      id: "pains-viennoiseries-patisseries",
      name: "Pains, Viennoiseries et Pâtisseries",
      image: "/categories/pains_viennoiseries_patisseries.png",
      subcategories: [
        "Pains",
        "Baguettes",
        "Pains de mie",
        "Viennoiseries",
        "Croissants",
        "Gâteaux",
      ],
    },
  ];

  function makeCategoryUrl(cat: (typeof categories)[number]) {
    const subcatIds = cat.subcategories
      .map((subcatName) => categoryIds[subcatName])
      .filter(Boolean);

    const queryString = subcatIds
      .map((id) => `categories=${encodeURIComponent(id)}`)
      .join("&");

    return `/category?${queryString}`;
  }

  return (
    <aside
      className={clsx(
        "md:w-64 h-screen bg-white shadow-md p-4 pt-24 overflow-y-auto fixed left-0 top-0",
        className
      )}
    >
      <nav className="space-y-2">
        <h2 className="hidden md:block text-lg font-bold mb-4">Rayons</h2>

        {categories.map((cat) => {
          const url = makeCategoryUrl(cat);

          return (
            <Link
              key={cat.id}
              onClick={() => setOpen?.(false)}
              href={url}
              className="
                flex items-center gap-3 p-3
                hover:bg-gray-100
                rounded-lg
                transition
              "
            >
              <img
                src={cat.image}
                alt={cat.name}
                width={40}
                height={40}
                className="object-contain"
                loading="lazy"
              />

              <span className="text-gray-700 font-bold">{cat.name} </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
