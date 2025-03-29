import { columns, Stock } from "./columns"
import { DataTable } from "./data-table"
import prisma from "@/lib/prisma"
import StocksCharts from "@/components/charts/StocksCharts"

async function getData(): Promise<Stock[]> {
    try {
        const stocks = await prisma.stock.findMany({
            select: {
                id: true,
                quantity: true,
                productId: true,
                updatedAt: true,
                product: {
                    select: {
                        name: true,
                        picture: true,
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        })

        return stocks.map((stock) => ({
            id: stock.id,
            quantity: stock.quantity,
            productId: stock.productId,
            productName: stock.product.name,
            productPicture: stock.product.picture,
            updatedAt: new Date(stock.updatedAt).toISOString(),
        }))
    } catch (error) {
        console.error("Erreur lors de la récupération des stocks :", error)
        return []
    }
}

export default async function DemoPage() {
    const data = await getData();

    return (
        <div className="container mx-auto py-10">
            <StocksCharts stocks={data} />

            <div className="mt-8">
                <DataTable columns={columns} data={data} />
            </div>
        </div>
    );
}
