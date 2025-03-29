"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { setUserPhone, deleteUserPhone } from "@/lib/server-actions/users-actions";
import { PlusCircle } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

type PhoneModalProps = {
    userId: string;
    currentPhone: string | null;
};

export default function PhoneModal({ userId, currentPhone }: PhoneModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    const [mode, setMode] = useState<"add-edit" | "delete">("add-edit");

    const [phoneValue, setPhoneValue] = useState(currentPhone || "");

    const router = useRouter();

    function openAddEditModal() {
        setMode("add-edit");
        setPhoneValue(currentPhone || "");
        setIsOpen(true);
    }

    function openDeleteModal() {
        setMode("delete");
        setIsOpen(true);
    }

    function closeModal() {
        setIsOpen(false);
    }

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        await setUserPhone(userId, phoneValue);
        closeModal();
        router.refresh();
    }

    async function handleDelete() {
        await deleteUserPhone(userId);
        closeModal();
        router.refresh();
    }

    if (!currentPhone) {
        return (
            <>
                <button
                    onClick={openAddEditModal}
                    className="flex items-center text-teal-700 mt-3 hover:underline"
                >
                    <PlusCircle className="mr-2" size={20} />
                    Ajouter un numéro
                </button>

                {isOpen && (
                    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
                        <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-2xl relative">
                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 text-gray-600 hover:text-black"
                            >
                                ✕
                            </button>

                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Ajouter un numéro
                            </h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block mb-1 font-semibold text-gray-800">
                                        Numéro de téléphone
                                    </label>
                                    <PhoneInput
                                        country={"fr"}
                                        value={phoneValue}
                                        onChange={(value) => setPhoneValue(value)}
                                        containerStyle={{ marginTop: "0.25rem" }}
                                    />
                                </div>

                                <div className="flex justify-end mt-5 gap-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="border border-gray-300 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-teal-700 text-white px-5 py-2 rounded-md font-semibold hover:bg-teal-800"
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

    return (
        <>
            <div className="mt-4 flex justify-center gap-4">
                <button
                    onClick={openAddEditModal}
                    className="bg-teal-700 text-white px-6 py-2 rounded-full hover:bg-teal-800"
                >
                    Modifier
                </button>

                <button
                    onClick={openDeleteModal}
                    className="absolute top-4 right-4 text-teal-700 hover:underline"
                >
                    Supprimer
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
                    <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-2xl relative">
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-gray-600 hover:text-black"
                        >
                            ✕
                        </button>

                        {mode === "add-edit" ? (
                            <>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                    Modifier mon numéro
                                </h2>
                                <form onSubmit={handleSave} className="space-y-4">
                                    <div>
                                        <label className="block mb-1 font-semibold text-gray-800">
                                            Numéro de téléphone
                                        </label>
                                        <PhoneInput
                                            country={"fr"}
                                            value={phoneValue}
                                            onChange={(value) => setPhoneValue(value)}
                                            containerStyle={{ marginTop: "0.25rem" }}
                                        />
                                    </div>

                                    <div className="flex justify-end mt-5 gap-4">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            className="border border-gray-300 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            className="bg-teal-700 text-white px-5 py-2 rounded-md font-semibold hover:bg-teal-800"
                                        >
                                            Enregistrer
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                    Supprimer mon numéro
                                </h2>
                                <p className="text-gray-700">
                                    Êtes-vous sûr de vouloir supprimer ce numéro&nbsp;?
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
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
