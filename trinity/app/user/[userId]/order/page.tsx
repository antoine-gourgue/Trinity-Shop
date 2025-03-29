"use client";

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserOrders } from "@/lib/server-actions/users-actions";

export const dynamic = "force-dynamic";

interface Product {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    price: number;
    description: string;
    picture: string;
    barCode: bigint;
    nutriScore: string | null;
    brandId: string;
}

interface ProductInCart {
    product: Product;
    quantity: number;
}

interface Cart {
    productsInCart: ProductInCart[];
}

interface Order {
    id: string;
    createdAt: Date;
    validated: boolean;
    cart: Cart;
}

interface UserOrdersPageProps {
    params: Promise<{ userId: string }>;
}

export default function UserOrdersPage({ params }: UserOrdersPageProps) {
    const { userId } = use(params);

    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [selectedDay, setSelectedDay] = useState("");
    const [customDate, setCustomDate] = useState("");

    useEffect(() => {
        const today = new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });
        setSelectedDay(today);
    }, []);

    useEffect(() => {
        async function fetchOrders() {
            const fetchedOrders: Order[] = (await getUserOrders(userId)).map(
                (order) => ({
                    ...order,
                    createdAt: new Date(order.createdAt),
                })
            );
            setOrders(fetchedOrders);
        }
        fetchOrders();
    }, [userId]);

    useEffect(() => {
        if (selectedDay) {
            const filtered = orders.filter(
                (order) =>
                    order.createdAt.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long"
                    }) === selectedDay
            );
            setFilteredOrders(filtered);
        } else if (customDate) {
            const selectedDate = new Date(customDate).toDateString();
            const filtered = orders.filter(
                (order) => order.createdAt.toDateString() === selectedDate
            );
            setFilteredOrders(filtered);
        } else {
            setFilteredOrders([]);
        }
    }, [selectedDay, customDate, orders]);

    if (!userId) return notFound();

    const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
            label: date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
            value: date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        };
    }).reverse();

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 bg-gray-50 space-y-6">
            <nav className="text-sm text-gray-600 mb-4 flex flex-wrap gap-1">
                <Link href={`/user/?userId=${userId}`} className="hover:underline">
                    Mon espace
                </Link>{" "}
                &gt; <span className="text-teal-700">Mes commandes</span>
            </nav>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Mes commandes
            </h1>

            <div className="flex space-x-2 overflow-x-auto pb-2">
                {daysOfWeek.map((day) => (
                    <button
                        key={day.value}
                        className={`px-4 py-2 text-sm font-semibold rounded ${
                            selectedDay === day.value
                                ? "bg-teal-600 text-white"
                                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        }`}
                        onClick={() => {
                            setSelectedDay(day.value);
                            setCustomDate("");
                        }}
                    >
                        {day.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center mt-2">
                <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                        setCustomDate(e.target.value);
                        setSelectedDay("");
                    }}
                    className="p-2 border rounded text-gray-700"
                />
            </div>

            {filteredOrders.length === 0 ? (
                <p className="text-gray-600 text-center text-lg font-medium">
                    Aucune commande trouvée pour{" "}
                    <span className="text-teal-600 font-semibold">
                        {customDate
                            ? new Date(customDate).toLocaleDateString("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })
                            : selectedDay}
                    </span>
                    .
                </p>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => {
                        const totalAmount = order.cart.productsInCart.reduce(
                            (acc: number, item: ProductInCart) =>
                                acc + (item.product.price * item.quantity) / 1000,
                            0
                        );

                        return (
                            <div
                                key={order.id}
                            >
                                <Link
                                    href={`/user/${userId}/order/${order.id}`}
                                    className="block p-5 bg-white border border-gray-300 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 transition duration-200"
                                >
                                    <div className="flex justify-between items-center flex-wrap gap-2">
                                        <h3 className="text-lg font-semibold text-gray-900 break-words">
                                            Commande #{order.id}
                                        </h3>
                                        <span
                                            className={`flex-shrink-0 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${
                                                order.validated
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                            }`}
                                        >
                                            {order.validated ? "Validée" : "En attente"}
                                        </span>
                                    </div>

                                    <div className="mt-2 text-gray-600 text-sm">
                                        <p>
                                            <span className="font-medium text-gray-800">Date :</span> {order.createdAt.toLocaleDateString("fr-FR", {
                                            weekday: "long",
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                        </p>
                                        <p>
                                            <span className="font-medium text-gray-800">Total :</span> {totalAmount.toFixed(2)} €
                                        </p>
                                        <p className="font-medium text-gray-800 mt-2">Produits :</p>
                                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                            {order.cart.productsInCart.map((item) => (
                                                <li key={item.product.id} className="flex justify-between">
                                                    <span className="truncate max-w-[180px] md:max-w-none">{item.product.name}</span>
                                                    <span className="text-gray-500">x {item.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
