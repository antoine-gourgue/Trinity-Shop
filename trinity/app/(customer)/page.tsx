import prisma from "@/lib/prisma";
import ProductCard from "@/components/product/productCard";
import CategoriesSection from "@/components/category/categoriesSections";
import ModesRetraitFAQ from "@/components/general/ModesRetraitFAQ";
import ReassuranceSection from "@/components/general/ReassuranceSection";
import Banner from "@/components/general/Banner";
import CategoryCarousel from "@/components/category/CategoryCarousel";
export default async function MainPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const searchQuery = (await searchParams).product || "";
  const products = await prisma.product.findMany({
    where: searchQuery
      ? {
          name: {
            contains: searchQuery,
            mode: "insensitive",
          },
        }
      : {},
    take: 24,
    include: {
      brand: true,
    },
  });

  return (
    <div className="w-full px-4 md:px-12 py-4">

      {searchQuery && products.length === 0 ? (
        <div className="container mx-auto px-4 ">
          <div className="container-xl bg-[#007d8f] p-4 flex items-center rounded-lg">
            <img
              className="w-12 h-auto"
              src="https://www.coursesu.com/on/demandware.static/-/Sites-DigitalU-Library/default/dwd9d9c3fd/images/error/0-results.svg"
              alt="Aucun produit trouvé"
            />
            <div className="ml-4 text-white">
              <h1 className="text-sm font-semibold">
                Désolé, nous n’avons rien trouvé pour{" "}
                <span className="text-white font-bold">{searchQuery}</span>.
              </h1>
              <p className="text-xs">Essayez de rechercher dans nos rayons.</p>
            </div>
          </div>

          <div className="text-center text-gray-900 text-lg font-semibold mt-4">
            Tentez un tour dans{" "}
            <span className="relative inline-block">
              <span className="relative z-10 font-bold">nos rayons</span>
              <svg
                className="absolute bottom-0 left-0 w-full h-[0.5em] z-0"
                viewBox="0 0 100 15"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 10 Q25 5, 50 10 T100 10"
                  fill="none"
                  stroke="#FFC107"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>

          <CategoriesSection />
          <ModesRetraitFAQ />
          <ReassuranceSection />
        </div>
      ) : (
          <div className="w-full px-2 md:px-4 py-1">
            {!searchQuery && <Banner />}

            <div className="rounded-lg overflow-hidden">
              {searchQuery && (
                  <div className="col-span-full bg-teal-800 text-white px-3 py-2 rounded-lg shadow-md mb-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex-shrink-0">
                        <svg
                            className="w-5 h-5 sm:w-6 sm:h-6"
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
                        <h1 className="text-sm sm:text-lg font-bold break-words leading-tight">
                          {`Résultats de recherche pour : "${searchQuery}"`}
                        </h1>

                        <span className="text-xs sm:text-sm font-medium text-gray-200 block mt-0">
              {products.length > 0
                  ? `${products.length} produit${products.length > 1 ? "s" : ""} trouvé${products.length > 1 ? "s" : ""}`
                  : "Aucun produit correspondant"}
            </span>
                      </div>
                    </div>
                  </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        picture={product.picture}
                        nutriScore={product.nutriScore || undefined}
                        rating={Math.floor(Math.random() * 5) + 1}
                        brand={product.brand.name}
                    />
                ))}
              </div>
            </div>
          </div>


      )}
    </div>
  );
}
