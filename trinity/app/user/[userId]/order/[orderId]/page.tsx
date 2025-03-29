import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderById } from "@/lib/server-actions/orders-actions";
import Image from "next/image";
import InvoiceDownloadButton from "@/components/invoice/InvoiceDownloadButton";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
    params: Promise<{ userId: string; orderId: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
    const { userId, orderId } = await params;

    if (!orderId || !userId) return notFound();

    const order = await getOrderById(orderId);

    if (!order) return notFound();

    const totalAmount = order.cart.productsInCart.reduce(
        (acc, item) => acc + (item.product.price * item.quantity) / 1000,
        0
    );

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 bg-gray-50 space-y-6">
            <nav className="text-sm text-gray-600 mb-4">
                <Link href={`/user/?userId=${userId}`} className="hover:underline">
                    Mon espace
                </Link>{" "}
                &gt;{" "}
                <Link href={`/user/${userId}/order`} className="hover:underline">
                    Mes commandes
                </Link>{" "}
                &gt; <span className="text-teal-700">Commande #{order.id}</span>
            </nav>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Détail de la commande</h1>
            <div className="mt-4">
                <InvoiceDownloadButton orderId={order.id} />
            </div>
            <div className="border border-gray-300 rounded-lg p-4 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <h2 className="text-lg md:text-xl font-semibold">Commande #{order.id}</h2>
                    <span
                        className={`text-sm px-2 py-1 rounded-full mt-2 sm:mt-0 ${
                            order.validated ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                        {order.validated ? "Validée" : "En attente"}
                    </span>
                </div>

                <p className="text-gray-600">
                    Date de la commande : {new Date(order.createdAt).toLocaleDateString()}
                </p>
                <p className="text-gray-600">Total : {totalAmount.toFixed(2)} €</p>

                <h3 className="text-lg font-semibold mt-4">Produits :</h3>
                <ul className="space-y-4">
                    {order.cart.productsInCart.map((item) => (
                        <li
                            key={item.product.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center bg-gray-50 p-4 rounded-lg shadow-sm"
                        >
                            <Image
                                src={item.product.picture || "/placeholder.png"}
                                alt={item.product.name}
                                width={96}
                                height={96}
                                className="w-24 h-24 object-cover rounded-lg mb-4 sm:mb-0 sm:mr-4"
                            />
                            <div className="flex-1">
                                <h4 className="text-lg font-semibold">{item.product.name}</h4>
                                <p className="text-gray-600 text-sm">{item.product.description}</p>

                                <p className="text-gray-700 mt-1">
                                    <strong>Prix unitaire :</strong> {(item.product.price / 1000).toFixed(2)} €
                                </p>
                                <p className="text-gray-700">
                                    <strong>Quantité :</strong> {item.quantity}
                                </p>
                                <p className="text-gray-700">
                                    <strong>Sous-total :</strong>{" "}
                                    {((item.product.price * item.quantity) / 1000).toFixed(2)} €
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <Link
                href={`/user/${userId}/order`}
                className="inline-block mt-4 text-teal-700 hover:underline"
            >
                ← Retour à mes commandes
            </Link>
        </div>
    );
}
