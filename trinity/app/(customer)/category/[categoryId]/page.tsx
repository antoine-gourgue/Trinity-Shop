import { notFound } from "next/navigation";
import { use } from "react";
import prisma from "@/lib/prisma";
import ProductCard from "@/components/product/productCard";
import Link from "next/link";

async function fetchCategory(categoryId: string) {
    return prisma.category.findUnique({
        where: {id: categoryId},
        include: {
            products: {
                include: {product: {include: {brand: true}}},
            },
        },
    });
}

export default function CategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
    const { categoryId } = use(params);

    if (!categoryId) return notFound();

    const category = use(fetchCategory(categoryId));

    if (!category) return notFound();

    const productCount = category.products.length;

    return (
        <div className="w-full px-4 md:px-12 py-4 rounded-lg">
            <div className="rounded-lg overflow-hidden mb-4">
            <div className="bg-teal-900 text-white px-4 py-3">
                <nav
                    className="text-sm flex items-center gap-2"
                    aria-label="breadcrumb"
                >
                    <Link href="/" className="hover:underline text-white">
                        Accueil
                    </Link>
                    <span className="text-gray-200">&gt;</span>
                    <span className="font-semibold">{category.name}</span>
                </nav>
            </div>

            <div className="bg-teal-800 text-white px-4 py-6 mb-4">
                <div className="flex items-center gap-3">
                    <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FFD600"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M4 5c2-3 7-3 9 0" />
                        <path d="M4 19c2 3 7 3 9 0" />
                    </svg>
                    <div className="flex-1">

                    <h1 className="text-2xl font-bold">{category.name}</h1>

                    <span className="text-sm font-medium">
            {productCount} produit{productCount > 1 && "s"}
          </span>
                    </div>
                </div>
            </div>
            </div>

            {category.products.length === 0 ? (
                <p className="text-gray-600">Aucun produit disponible pour cette catégorie.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {category.products.map(({ product }) => (
                        <ProductCard
                            key={product.id}
                            id={product.id}
                            name={product.name}
                            price={product.price}
                            picture={product.picture}
                            nutriScore={product.nutriScore || undefined}
                            rating={Math.floor(Math.random() * 5) + 1}
                            brand={product.brand?.name}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
