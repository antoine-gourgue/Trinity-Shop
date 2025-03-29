import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ProductCard from "@/components/product/productCard";
import Link from "next/link";
import React from "react";

export default async function CategoryPage({
                                             searchParams,
                                           }: {
  searchParams: Promise<{ categories?: string | string[] }>;
}) {
  if (!(await searchParams).categories) return notFound();

  const categoryIds = Array.isArray((await searchParams).categories)
      ? ((await searchParams).categories as string[])
      : [(await searchParams).categories as string];

  if (categoryIds.length === 0) return notFound();

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    include: {
      products: {
        include: { product: { include: { brand: true } } },
      },
    },
  });

  if (categories.length === 0) return notFound();

  const products = categories.flatMap((cat) =>
      cat.products.map(({ product }) => product)
  );
  const uniqueProducts = Array.from(new Map(products.map((p) => [p.id, p])).values());

  const catNames = categories.map((c) => c.name).join(", ");

  const productCount = uniqueProducts.length;

  return (
      <div className="w-full px-4 md:px-12 py-4">

        <div className="rounded-lg overflow-hidden mb-4">
          <div className="bg-teal-900 text-white px-4 py-3">
            <nav
                className="text-sm flex flex-wrap items-center gap-2 overflow-auto"
                aria-label="breadcrumb"
            >
              <Link href="/" className="hover:underline text-white">
                Accueil
              </Link>
              {categories.map((cat, index) => (
                  <React.Fragment key={cat.id}>
                    <span className="text-gray-200">&gt;</span>
                    <Link
                        href={`?categories=${encodeURIComponent(cat.id)}`}
                        className="hover:underline text-white"
                    >
                      {cat.name}
                    </Link>
                  </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="bg-teal-800 text-white px-4 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              <div className="flex-shrink-0">
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
              </div>

              <div className="flex-1">
                <h1 className="text-lg sm:text-2xl font-bold break-words">{catNames}</h1>
                <span className="text-sm font-medium text-gray-200 block sm:inline">
          {productCount} produit{productCount > 1 && "s"}
        </span>
              </div>
            </div>
          </div>
        </div>



        {uniqueProducts.length === 0 ? (
            <p className="text-gray-600">
              Aucun produit disponible pour ces catégories.
            </p>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {uniqueProducts.map((product) => (
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
