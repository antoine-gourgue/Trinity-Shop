"use client";

import Link from "next/link";
import {Apple, Drumstick, Snowflake, Candy, Sun, Sandwich, Soup, Croissant} from "lucide-react";
import { useState, useEffect } from "react";
import getCategoriesActions from "@/lib/server-actions/get-categories-actions";

const categories = [
    {
        id: "fruits-legumes",
        name: "Fruits et Légumes",
        color: "bg-teal-600",
        icon: Apple,
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
        color: "bg-teal-600",
        icon: Drumstick,
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
        color: "bg-teal-600",
        icon: Sandwich,
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
        color: "bg-teal-600",
        icon: Sun,
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
        color: "bg-teal-600",
        icon: Snowflake,
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
        color: "bg-teal-600",
        icon: Soup,
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
        color: "bg-teal-600",
        icon: Candy,
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
        color: "bg-teal-600",
        icon: Croissant,
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

export default function CategoryCarousel() {
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
        <div className="w-64 overflow-x-auto px-4 py-4">
            <div className="flex flex-nowrap gap-4">
                {categories.map((category) => {
                    const url = makeCategoryUrl(category);
                    const Icon = category.icon;
                    return (
                        <Link
                            key={category.id}
                            href={url}
                            className={`flex flex-col items-center justify-center ${category.color} text-white rounded-xl min-w-[7rem] w-28 h-28 shrink-0 hover:opacity-90 transition`}
                        >
                            <Icon size={28} className="mb-2" />
                            <span className="text-xs font-semibold text-center px-1">
            {category.name}
          </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
