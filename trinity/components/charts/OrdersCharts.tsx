"use client";

import { TrendingUp } from "lucide-react";
import { BarChart, Bar, LabelList, LineChart, Line, XAxis } from "recharts";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

const OrdersTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload?.length) {
        const { date, count } = payload[0].payload;
        return (
            <div className="text-sm p-2 bg-white shadow-md rounded-md">
                Commandes ({date}) : {count}
            </div>
        );
    }
    return null;
};

const UsersTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload?.length) {
        const { email, count } = payload[0].payload;
        return (
            <div className="text-sm p-2 bg-white shadow-md rounded-md">
                {email} : {count} commandes
            </div>
        );
    }
    return null;
};

interface Order {
    id: string;
    cartId: string;
    userId: string;
    createdAt: string;
    email: string;
}

const OrdersCharts = ({ orders }: { orders: Order[] }) => {

    const ordersByDate: { [key: string]: number } = {};
    const ordersByUser: { [key: string]: number } = {};

    orders.forEach((order) => {
        const date = order.createdAt.split("T")[0];
        ordersByDate[date] = (ordersByDate[date] || 0) + 1;
        ordersByUser[order.email] = (ordersByUser[order.email] || 0) + 1;
    });

    const sortedDates = Object.keys(ordersByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const sortedOrdersByDate = sortedDates.map((date) => ({
        date,
        count: ordersByDate[date],
    }));

    const sortedOrdersByUser = Object.entries(ordersByUser)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([email, count]) => ({
            email,
            count,
        }));

    const chartConfig = {
        orders: {
            label: "Commandes",
            color: "hsl(var(--chart-1))",
        },
        users: {
            label: "Clients",
            color: "hsl(var(--chart-2))",
        },
    } satisfies ChartConfig;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Évolution des commandes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig}>
                        <LineChart data={sortedOrdersByDate}>
                            <XAxis dataKey="date" hide />
                            <ChartTooltip cursor={false} content={<OrdersTooltip />} />
                            <Line
                                dataKey="count"
                                type="natural"
                                stroke="var(--color-orders)"
                                strokeWidth={2}
                                dot={{ fill: "var(--color-orders)" }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="flex gap-2 font-medium leading-none">
                        Suivi des commandes
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="leading-none text-muted-foreground">
                        Évolution quotidienne des commandes passées
                    </div>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Top clients (nombre de commandes)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig}>
                        <BarChart data={sortedOrdersByUser}>
                            <ChartTooltip cursor={false} content={<UsersTooltip />} />
                            <Bar dataKey="count" fill="var(--color-users)" radius={8}/>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="flex gap-2 font-medium leading-none">
                        5 meilleurs clients
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="leading-none text-muted-foreground">
                        Basé sur le nombre de commandes passées
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default OrdersCharts;
