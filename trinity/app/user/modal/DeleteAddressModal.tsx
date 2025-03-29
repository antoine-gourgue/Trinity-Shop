"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUserAddress } from "@/lib/server-actions/users-actions";

type DeleteAddressModalProps = {
    addressId: string;
};

export default function DeleteAddressModal({ addressId }: DeleteAddressModalProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    function openModal() {
        setOpen(true);
    }

    function closeModal() {
        setOpen(false);
    }

    async function handleDelete() {
        await deleteUserAddress(addressId);
        closeModal();
        router.refresh();
    }

    return (
        <>
            <button
                onClick={openModal}
                className="text-gray-500 hover:text-red-600 transition-colors"
                title="Supprimer"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                            Supprimer l’adresse
                        </h2>

                        <p className="text-gray-700">
                            Êtes-vous sûr de vouloir supprimer cette adresse&nbsp;?
                            <br />
                            Cette action est irréversible.
                        </p>

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
                                onClick={handleDelete}
                                className="bg-red-600 text-white px-5 py-2 rounded-md
                           font-semibold hover:bg-red-700"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
