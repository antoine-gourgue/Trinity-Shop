"use client";
import { useState } from "react";
import { FaTruck, FaShoppingCart } from "react-icons/fa";

export default function ShippingModes() {
    const [activeTab, setActiveTab] = useState<"drive" | "delivery">("drive");

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Modes de retrait</h2>

                <div className="flex space-x-1">
                    <button
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border rounded-lg ${
                            activeTab === "drive"
                                ? "border-gray-300 bg-white text-black"
                                : "border-gray-300 text-gray-600 bg-gray-50"
                        }`}
                        onClick={() => setActiveTab("drive")}
                    >
                        <FaShoppingCart className="text-gray-700" />
                        <span className="font-semibold">Drive</span>
                    </button>

                    <button
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border rounded-lg ${
                            activeTab === "delivery"
                                ? "border-gray-300 bg-white text-black"
                                : "border-gray-300 text-gray-600 bg-gray-50"
                        }`}
                        onClick={() => setActiveTab("delivery")}
                    >
                        <FaTruck className="text-gray-700" />
                        <span className="font-semibold">Livraison</span>
                    </button>
                </div>

                <div className="border border-gray-300 p-6 bg-white mt-[-1px] rounded-lg">
                    {activeTab === "drive" ? (
                        <div>
                            <p className="text-gray-800 font-medium">
                                <span className="font-bold">Retrait drive</span> à partir du{" "}
                                <span className="font-bold">Mardi 11 février à 09h00</span>
                            </p>
                            <p className="text-gray-800">
                                <span className="font-bold">Montant minimum :</span> 30€
                                <span className="text-gray-500"> | Frais de préparation offerts</span>
                            </p>
                            <p className="text-gray-800">
                                <span className="font-bold">Moyens de paiement :</span> CB, Visa, Mastercard
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-gray-800 font-medium">
                                <span className="font-bold">Livraison à domicile</span> disponible à partir du{" "}
                                <span className="font-bold">Mardi 11 février à 09h00</span>
                            </p>
                            <p className="text-gray-800">
                                <span className="font-bold">Montant minimum :</span> 50€
                                <span className="text-gray-500"> | Frais de livraison : 10€</span>
                            </p>
                            <p className="text-gray-800">
                                <span className="font-bold">Moyens de paiement :</span> CB, Visa, Mastercard
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">FAQ et Contact</h2>

                <div className="space-y-4">
                    <div className="bg-white p-4 border border-gray-300 rounded-lg">
                        <p className="text-sm font-semibold text-gray-900">Contactez-nous</p>
                        <a
                            href="/legal/contact"
                            className="text-[#005562] text-sm font-medium hover:underline"
                        >
                            Nous joindre
                        </a>
                    </div>

                    <div className="bg-white p-4 border border-gray-300 rounded-lg">
                        <p className="text-sm font-semibold text-gray-900">Questions fréquentes</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-gray-100 border rounded-lg text-gray-800 text-xs font-medium">
                                Mon Compte U
                            </span>
                            <span className="px-3 py-1 bg-gray-100 border rounded-lg text-gray-800 text-xs font-medium">
                                Ma Carte U
                            </span>
                            <span className="px-3 py-1 bg-gray-100 border rounded-lg text-gray-800 text-xs font-medium">
                                Ma commande
                            </span>
                            <span className="px-3 py-1 bg-gray-100 border rounded-lg text-gray-800 text-xs font-medium">
                                Mon panier
                            </span>
                        </div>
                        <a
                            href="/legal/maintenance"
                            className="text-[#005562] text-sm font-medium hover:underline block mt-2"
                        >
                            Tout voir
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
