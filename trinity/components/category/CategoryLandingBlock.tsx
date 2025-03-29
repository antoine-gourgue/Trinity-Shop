import prisma from "@/lib/prisma";
import Link from "next/link";

interface CategoryLandingProps {
    categoryId: string;
}

export default async function CategoryLandingBlock({ categoryId }: CategoryLandingProps) {
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
            products: {
                include: {
                    product: true,
                },
            },
        },
    });

    if (!category) return <p>Catégorie non trouvée.</p>;

    const relatedCategories = await prisma.category.findMany({
        where: {
            products: {
                some: {
                    productId: {
                        in: category.products.map((p) => p.productId),
                    },
                },
            },
        },
    });

    return (
        <div className="category-landing-block">
            <ol className="plp-breadcrumb su-font-open clearfix">
                <li>
                    <Link href="/">Accueil</Link>
                </li>
                <li className="arrow-simple-before">
                    <Link href={`/category/${category.id}`} className="breadcrumb-name">
                        {category.name}
                    </Link>
                </li>
            </ol>

            <div className="plp-header sub-category-header">
                <h1 className="plp-title">{category.name}</h1>
                <p className="plp-products-count">{category.products.length} produits</p>
            </div>

            {relatedCategories.length > 0 && (
                <div className="plp-badges-wrapper">
                    <div className="plp-badges-title">
                        <h2 className="plp-badges-title-heading">Autres catégories similaires</h2>
                    </div>
                    <div className="plp-badges-content">
                        {relatedCategories.map((subCat) => (
                            <Link key={subCat.id} className="plp-badges-link" href={`/category/${subCat.id}`}>
                                {subCat.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {relatedCategories.length > 0 && (
                <div className="category-slider-wrapper">
                    {relatedCategories.map((subCat) => (
                        <Link key={subCat.id} className="slider-item category-slider-item" href={`/category/${subCat.id}`}>
                            {subCat.name}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
