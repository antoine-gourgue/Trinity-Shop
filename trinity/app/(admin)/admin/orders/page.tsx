import { columns, Order } from "./columns";
import { DataTable } from "./data-table";
import OrdersCharts from "@/components/charts/OrdersCharts";
import prisma from "@/lib/prisma";

async function getOrdersData(): Promise<Order[]> {
    try {
        const orders = await prisma.order.findMany({
            select: {
                id: true,
                cartId: true,
                userId: true,
                billingAddress: {
                    select: {
                        street: true,
                        city: true,
                        zipCode: true,
                        country: true,
                    },
                },
                validated: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return orders.map((order) => ({
            id: order.id,
            cartId: order.cartId,
            userId: order.userId,
            billingAddress: order.billingAddress
                ? `${order.billingAddress.street}, ${order.billingAddress.zipCode} ${order.billingAddress.city}, ${order.billingAddress.country}`
                : null,
            validated: order.validated,
            createdAt: new Date(order.createdAt).toISOString(),
            updatedAt: new Intl.DateTimeFormat('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }).format(new Date(order.updatedAt)),
            email: order.user.email,
        }));
    } catch (error) {
        console.error(error);
        return [];
    }
}


export default async function OrdersPage() {
    const orders = await getOrdersData();

    return (
        <div className="container mx-auto py-10">
            <OrdersCharts orders={orders} />

            <div className="mt-8">
                <DataTable columns={columns} data={orders} />
            </div>
        </div>
    );
}
