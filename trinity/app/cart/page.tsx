"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Loader2, Lock, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import { useSession } from "next-auth/react";
import { getActiveCartId } from "@/lib/server-actions/cart-actions";

export default function CartPage() {
    const { cartProducts, removeProduct, updateProductQuantity, refreshCart } = useCart();
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const billingAddress = session?.user?.billingAddress;

    const [cartId, setCartId] = useState<string | null>(null);
    const [loadingCart, setLoadingCart] = useState<boolean>(true);
    const [paying, setPaying] = useState<boolean>(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCartId() {
            const cartResponse = await getActiveCartId();
            if (cartResponse?.cartId) {
                setCartId(cartResponse.cartId);
            } else {
                setCartId(null);
            }
            setLoadingCart(false);
        }

        fetchCartId();
    }, []);

    console.log("cartId:", cartId);

    const handleRemoveProduct = async (productId: string) => {
        await removeProduct(productId);
    };

    const handleUpdateProductQuantity = async (productId: string, quantity: number) => {
        if (quantity < 1) return;
        await updateProductQuantity(productId, quantity);
    };

    const handleClearCart = async () => {
        for (const product of cartProducts) {
            await removeProduct(product.id);
        }
        await refreshCart();
    };

    const totalPrice = cartProducts.reduce((acc, product) => acc + product.price * product.quantity, 0);
    const totalPriceEuro = (totalPrice / 1000).toFixed(2);

    // Paiement simulé : même flux de commande que PayPal, sans transaction réelle
    const handleSimulatedPayment = async () => {
        setPaymentError(null);

        if (!userId) {
            setPaymentError("Connectez-vous pour finaliser la commande.");
            return;
        }
        if (!cartId) {
            setPaymentError("Aucun panier actif trouvé.");
            return;
        }

        setPaying(true);
        try {
            // Petit délai pour matérialiser l'étape de paiement
            await new Promise((resolve) => setTimeout(resolve, 1200));

            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, cartId, billingAddressId: billingAddress }),
            });

            if (!response.ok) {
                console.error("Erreur lors de la création de la commande", await response.json());
                setPaymentError("La commande n'a pas pu être créée. Réessayez.");
                return;
            }

            window.location.href = "/?payment=success";
        } catch {
            setPaymentError("Une erreur est survenue pendant le paiement simulé.");
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col overflow-hidden bg-gray-50">
            <div className="flex-1 overflow-auto">
                <div className="max-w-5xl lg:max-w-4xl xl:max-w-6xl mx-auto p-4 md:p-6 space-y-6">
                    <motion.div
                        className="border border-gray-300 shadow-sm rounded-lg p-6 bg-white flex flex-col gap-4"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-3xl font-extrabold text-gray-900">
                            Mon Panier {cartProducts.length > 0 && `(${cartProducts.length})`}
                        </h1>
                        {cartProducts.length === 0 && (
                            <p className="text-gray-500">Votre panier est vide.</p>
                        )}
                    </motion.div>

                    {cartProducts.length > 0 && (
                        <div className="grid grid-cols-1 gap-6">
                            <motion.div
                                className="border border-gray-300 shadow-sm rounded-lg p-4 bg-white flex flex-col gap-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <AnimatePresence>
                                    {cartProducts.map((product) => (
                                        <motion.div
                                            key={product.id}
                                            className="relative border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm bg-white"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.3 }}
                                            layout
                                        >
                                            <motion.button
                                                onClick={() => handleRemoveProduct(product.id)}
                                                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <Trash2 size={20} />
                                            </motion.button>
                                            <div className="flex-shrink-0 w-28 h-28 md:w-32 md:h-32 rounded-lg overflow-hidden">
                                                <Image
                                                    src={product.picture}
                                                    alt={product.name}
                                                    width={128}
                                                    height={128}
                                                    className="object-contain w-full h-full"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col gap-2">
                                                <h2 className="font-semibold text-base md:text-lg text-gray-800">
                                                    {product.name}
                                                </h2>
                                                <p className="text-2xl font-bold text-gray-900">
                                                    {(product.price / 1000).toFixed(2)} €
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Prix au kg {(product.price / 1000).toFixed(2)} €
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-3">
                                                <motion.div
                                                    className="bg-teal-700 text-white rounded-full px-4 py-2 flex items-center gap-4"
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <motion.button
                                                        onClick={() => handleUpdateProductQuantity(product.id, product.quantity - 1)}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <Minus size={18} />
                                                    </motion.button>
                                                    <motion.span className="font-semibold" layout>
                                                        {product.quantity}
                                                    </motion.span>
                                                    <motion.button
                                                        onClick={() => handleUpdateProductQuantity(product.id, product.quantity + 1)}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <Plus size={18} />
                                                    </motion.button>
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>

                            <motion.div
                                className="flex items-center gap-2 mt-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Trash2 size={16} className="text-teal-700" />
                                <button
                                    onClick={handleClearCart}
                                    className="text-teal-700 text-sm underline hover:no-underline"
                                >
                                    Vider le panier
                                </button>
                            </motion.div>

                            <motion.div
                                className="border border-gray-300 shadow-sm rounded-lg p-4 bg-white flex flex-col gap-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex items-center justify-between text-lg font-bold">
                                    <span>Total estimé</span>
                                    <span>{totalPriceEuro} €</span>
                                </div>

                                <div className="flex justify-center">
                                    <div className="w-full max-w-md flex flex-col gap-2">
                                        <button
                                            onClick={handleSimulatedPayment}
                                            disabled={paying}
                                            className="w-full flex items-center justify-center gap-2 rounded-full bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 mt-2 transition"
                                        >
                                            {paying ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Paiement en cours…
                                                </>
                                            ) : (
                                                <>
                                                    <Lock size={16} />
                                                    Payer {totalPriceEuro} €
                                                </>
                                            )}
                                        </button>
                                        {paymentError && (
                                            <p className="text-sm text-red-600 text-center">{paymentError}</p>
                                        )}
                                        <p className="text-xs text-gray-400 text-center">
                                            Paiement de démonstration — aucun débit réel n’est effectué.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
