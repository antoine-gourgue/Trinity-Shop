"use client";

import { useState, useTransition, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { FaShoppingBag, FaStar } from "react-icons/fa";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import LoginModal from "@/components/modal/LoginModal";
import { useRouter } from "next/navigation";

interface ProductProps {
    id: string;
    name: string;
    price: number;
    picture: string;
    nutriScore?: string;
    rating?: number;
    brand?: string;
}

export default function ProductCard({ id, name, price, picture, nutriScore, rating, brand }: ProductProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [quantity, setQuantity] = useState(0);
    const { cartProducts, addProductToCart, removeProduct, updateProductQuantity } = useCart();
    const priceInEuros = (price / 1000).toFixed(2);

    useEffect(() => {
        const existingProduct = cartProducts.find((p) => p.id === id);
        if (existingProduct) {
            setQuantity(existingProduct.quantity);
        }
    }, [cartProducts, id]);

    const handleAddToCart = () => {
        if (!session) {
            setIsLoginModalOpen(true);
            return;
        }

        startTransition(async () => {
            try {
                await addProductToCart(id, 1);
            } catch (error) {
                console.error("Erreur lors de l'ajout au panier :", error);
            }
        });
    };

    const handleIncreaseQuantity = () => {
        startTransition(async () => {
            await updateProductQuantity(id, quantity + 1);
        });
    };

    const handleDecreaseQuantity = () => {
        if (quantity <= 1) {
            startTransition(async () => {
                await removeProduct(id);
            });
        } else {
            startTransition(async () => {
                await updateProductQuantity(id, quantity - 1);
            });
        }
    };

    return (
        <>
            <li className="bg-white shadow-md rounded-lg overflow-hidden p-4 flex flex-col h-full">
                <div className="flex flex-col flex-grow">
                    <button
                        onClick={() => router.push(`/product/${id}`)}
                        className="flex flex-col flex-grow text-left"
                    >
                        <div className="relative w-full h-48 flex justify-center items-center">
                            <Image
                                src={picture}
                                alt={name}
                                width={180}
                                height={180}
                                className="object-contain w-auto h-full"
                            />
                        </div>

                        <div className="flex-grow mt-2">
                            <h2 className="text-sm font-semibold text-gray-800 leading-tight">
                                <span className="text-gray-600 uppercase text-xs">{brand}</span>
                                <br />
                                {name}
                            </h2>

                            {nutriScore && (
                                <div className="mt-1">
                                    <Image
                                        src={`/assets/nutri-score-${nutriScore?.toUpperCase()}.png`}
                                        alt={`NutriScore ${nutriScore}`}
                                        width={57}
                                        height={30}
                                    />
                                </div>
                            )}

                            {rating !== undefined && (
                                <div className="flex items-center mt-1">
                                    {[...Array(5)].map((_, index) => (
                                        <FaStar
                                            key={index}
                                            className={`text-yellow-400 ${index < rating ? "opacity-100" : "opacity-30"}`}
                                        />
                                    ))}
                                    <span className="ml-1 text-sm text-gray-500">({rating})</span>
                                </div>
                            )}
                        </div>
                    </button>

                    <div className="flex items-center justify-between mt-auto">
                        <span className="text-xl font-bold text-gray-900">{priceInEuros} €</span>

                        {quantity === 0 ? (
                            <button
                                className="bg-teal-600 text-white w-12 h-10 rounded-full flex items-center justify-center hover:bg-teal-700 transition disabled:opacity-50"
                                onClick={handleAddToCart}
                                disabled={isPending}
                            >
                                <FaShoppingBag size={16} />
                            </button>
                        ) : (
                            <div className="flex items-center bg-teal-600 text-white w-28 h-10 rounded-full justify-between px-2">
                                <button
                                    onClick={handleDecreaseQuantity}
                                    className=" rounded-full p-1"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="font-semibold">{quantity}</span>
                                <button
                                    onClick={handleIncreaseQuantity}
                                    className=" rounded-full p-1"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </li>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </>
    );
}
