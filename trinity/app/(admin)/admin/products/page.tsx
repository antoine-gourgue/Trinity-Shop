import prisma from "@/lib/prisma";
import { Product, columns } from "./columns";
import { DataTable } from "./data-table";

async function getData(): Promise<Product[]> {
    try {
        const products = await prisma.product.findMany({
            orderBy: { barCode: "desc" },
            select: {
                id: true,
                name: true,
                price: true,
                barCode: true,
                description: true,
                picture: true,
                nutriScore: true,
                brand: {
                    select: {
                        name: true,
                    },
                },
                categories: {
                    select: {
                        categoryName: true,
                    },
                },
            },
        });

        return products.map(product => ({
            productId: product.id,
            name: product.name,
            price: product.price,
            barcode: product.barCode,
            description: product.description,
            picture: product.picture,
            nutriscore: product.nutriScore,
            brand: product.brand.name,
            category: product.categories.map(category => category.categoryName).join(", "),
        }));
    } catch (error) {
        console.error("Erreur lors de la récupération des produits:", error);
        throw new Error("Internal Server Error");
    }
}

export default async function DemoPage() {
    const data = await getData();

    return (
        <div className="container mx-auto py-10">
            <DataTable columns={columns} data={data} />
        </div>
    );
}
