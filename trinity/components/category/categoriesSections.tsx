import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function CategoriesSection() {
    const dbCategories = await prisma.category.findMany({
        select: { id: true, name: true },
    });

    console.log("📌 Toutes les catégories disponibles :", dbCategories.map(c => c.name));

    const categoryIds = Object.fromEntries(dbCategories.map(c => [c.name, c.id]));

    const categories = [
        { id: "fruits-legumes", name: "Fruits et Légumes", image: "/categories/fruits_legumes.png", subcategories: ["Légumes et dérivés", "Fruits et produits dérivés", "Salades", "Fruits secs", "Fruits tropicaux"] },
        { id: "viandes-poissons", name: "Viandes et Poissons", image: "/categories/viande_poissons.png", subcategories: ["Viandes", "Charcuteries", "Jambons", "Poissons", "Filets de poissons", "Poissons surgelés", "Saumons", "Poissons fumés"] },
        { id: "charcuterie-traiteur", name: "Charcuterie et Traiteur", image: "/categories/charcuterie.webp", subcategories: ["Charcuteries", "Jambons", "Saucissons", "Pâtés", "Rillettes", "Terrines", "Plats préparés à base de charcuterie"] },
        { id: "produits-frais", name: "Produits Frais", image: "/categories/produit_frais.png", subcategories: ["Produits laitiers", "Desserts", "Fromages", "Yaourts", "Viandes fraîches", "Poissons frais"] },
        { id: "surgeles", name: "Surgelés", image: "/categories/surgeles_etoile.png", subcategories: ["Plats préparés surgelés", "Desserts glacés", "Poissons surgelés", "Viandes surgelées", "Viennoiseries surgelées"] },
        { id: "epicerie-salee", name: "Épicerie Salée", image: "/categories/epicerie_salee.png", subcategories: ["Pâtes", "Riz", "Conserves", "Soupes", "Plats préparés en conserve", "Assaisonnements"] },
        { id: "epicerie-sucree", name: "Épicerie Sucrée", image: "/categories/epicerie_sucree.png", subcategories: ["Biscuits", "Chocolats", "Confiseries", "Bonbons", "Céréales", "Miel", "Confitures"] },
        { id: "pains-viennoiseries-patisseries", name: "Pains, Viennoiseries et Pâtisseries", image: "/categories/pains_viennoiseries_patisseries.png", subcategories: ["Pains", "Baguettes", "Pains de mie", "Viennoiseries", "Croissants", "Gâteaux"] },
    ];

    return (
        <div>
            <ul className="w-full grid grid-cols-2 mt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {categories.map((category) => {
                    const subcategoryIds = category.subcategories
                        .map(sub => categoryIds[sub])
                        .filter(Boolean);

                    const query = subcategoryIds.map(id => `categories=${encodeURIComponent(id)}`).join("&");
                    const url = `/category?${query}`;

                    return (
                        <li key={category.id} className="categories-section-category bg-gray-100 rounded-lg p-4 hover:shadow-lg transition-shadow">
                            <Link className="categories-section-category-link flex flex-col items-center text-center" href={url}>
                                <div className="categories-section-category-icon mb-2">
                                    <img
                                        className="categories-section-image w-[60px] h-[60px] object-contain"
                                        width="60"
                                        height="60"
                                        src={category.image}
                                        alt={category.name}
                                        loading="lazy"
                                    />
                                </div>
                                <span className="categories-section-name text-sm font-medium">{category.name}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
