"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, LabelList } from "recharts"

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
} from "@/components/ui/chart"

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload?.length) {
        const { productName, quantity } = payload[0].payload
        return (
            <div className="text-sm p-2 bg-white shadow-md rounded-md">
                {productName} : {quantity}
            </div>
        )
    }
    return null
}

interface Stock {
    id: string
    quantity: number
    productId: string
    productName: string
    updatedAt: string
}

const StocksCharts = ({ stocks }: { stocks: Stock[] }) => {
    const lowStockProducts = stocks
        .filter((p) => p.quantity < 50)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 5)

    const highStockProducts = stocks
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

    const chartConfig = {
        lowStock: {
            label: "Stock",
            color: "hsl(var(--chart-1))",
        },
        highStock: {
            label: "Stock",
            color: "hsl(var(--chart-2))",
        },


    } satisfies ChartConfig

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">

            <Card>
                <CardHeader>
                    <CardTitle>Produits en rupture de stock</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig}>
                        <BarChart data={lowStockProducts}>
                            <ChartTooltip cursor={false} content={<CustomTooltip />} />
                            <Bar dataKey="quantity" fill="var(--color-lowStock)" radius={8}>
                                <LabelList dataKey="productName" position="middle" className="fill-foreground text-sm" />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="flex gap-2 font-medium leading-none">
                        {lowStockProducts.length} produits en faible stock
                        <TrendingUp className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="leading-none text-muted-foreground">
                        Seuil de rupture <strong>&lt; 50 unités</strong>
                    </div>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Produits avec le plus de stock</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig}>
                        <BarChart data={highStockProducts}>
                            <ChartTooltip cursor={false} content={<CustomTooltip />} />
                            <Bar dataKey="quantity" fill="var(--color-highStock)" radius={8}>
                                <LabelList
                                    dataKey="productName"
                                    position="middle"
                                    className="fill-foreground text-xs"
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="flex gap-2 font-medium leading-none">
                        5 des produits les plus en stock
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="leading-none text-muted-foreground">
                        Stocks les plus élevés actuellement
                    </div>
                </CardFooter>
            </Card>

        </div>
    )
}

export default StocksCharts
