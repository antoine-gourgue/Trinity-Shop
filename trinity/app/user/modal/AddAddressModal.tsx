"use client";

import { useState, FormEvent } from "react";
import { createUserAddress } from "@/lib/server-actions/users-actions";
import { useRouter } from "next/navigation";

type Props = {
    userId: string;
    defaultType: "domicile" | "livraison";
};

export default function AddAddressModal({ userId, defaultType }: Props) {
    const [open, setOpen] = useState(false);

    const [street, setStreet] = useState("");
    const [zipCode, setZipCode] = useState("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");
    const [type, setType] = useState<"domicile" | "livraison">(defaultType);

    const router = useRouter();

    function openModal() {
        setStreet("");
        setZipCode("");
        setCity("");
        setCountry("");
        setType(defaultType);
        setOpen(true);
    }

    function closeModal() {
        setOpen(false);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        await createUserAddress(userId, {
            street,
            city,
            zipCode,
            country,
            type,
        });
        setOpen(false);
        router.refresh();
    }

    return (
        <>
            <button onClick={openModal} className="flex items-center text-teal-700 hover:underline">
                <svg className="mr-2" width={20} height={20} fill="none" stroke="currentColor">
                    <path
                        d="M12 5v14m7-7H5"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                Ajouter une adresse
            </button>

            {open && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
                    <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-2xl relative">
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-gray-600 hover:text-black"
                        >
                            ✕
                        </button>

                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Ajouter une adresse
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block mb-1 font-semibold text-gray-800">Rue</label>
                                <input
                                    type="text"
                                    required
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2
                             focus:outline-none focus:ring-2 focus:ring-teal-600"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block mb-1 font-semibold text-gray-800">
                                        Code postal
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={zipCode}
                                        onChange={(e) => setZipCode(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2
                               focus:outline-none focus:ring-2 focus:ring-teal-600"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block mb-1 font-semibold text-gray-800">
                                        Ville
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="w-full border border-gray-300 rounded px-3 py-2
                               focus:outline-none focus:ring-2 focus:ring-teal-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-1 font-semibold text-gray-800">Pays</label>
                                <input
                                    type="text"
                                    required
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2
                             focus:outline-none focus:ring-2 focus:ring-teal-600"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 font-semibold text-gray-800">
                                    Type d'adresse
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as "domicile" | "livraison")}
                                    className="w-full border border-gray-300 rounded px-3 py-2
                             focus:outline-none focus:ring-2 focus:ring-teal-600"
                                >
                                    <option value="domicile">Domicile</option>
                                    <option value="livraison">Livraison</option>
                                </select>
                            </div>

                            <div className="flex justify-end mt-5 gap-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="border border-gray-300 px-4 py-2 rounded-md
                             text-gray-700 hover:bg-gray-100"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="bg-teal-700 text-white px-5 py-2 rounded-md
                             font-semibold hover:bg-teal-800"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
