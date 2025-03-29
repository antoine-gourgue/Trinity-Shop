"use client";

import { FormEvent, useState } from "react";
import { updateUserEmail } from "@/lib/server-actions/users-actions";
import { useRouter } from "next/navigation";

type EditEmailModalProps = {
    userId: string;
    currentEmail: string;
};

export default function EditEmailModal({ userId, currentEmail }: EditEmailModalProps) {
    const [open, setOpen] = useState(false);
    const [newEmail, setNewEmail] = useState(currentEmail);
    const router = useRouter();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        await updateUserEmail({ userId, newEmail });
        setOpen(false);
        router.refresh();
    }

    function openModal() {
        setNewEmail(currentEmail);
        setOpen(true);
    }

    return (
        <>
            <button
                onClick={openModal}
                className="text-teal-700 hover:underline"
            >
                Modifier
            </button>

            {open && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
                    <div className="bg-white rounded-lg max-w-sm w-full p-6 relative">
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute top-3 right-3 text-gray-600 hover:text-black"
                        >
                            ✕
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Modifier mon e-mail
                        </h2>

                        <p className="text-gray-700 text-sm mb-5">
                            En cliquant sur 'Enregistrer', votre nouvelle adresse e-mail sera mise à jour si celle-ci n'est pas déjà utilisée.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block font-semibold text-gray-800 mb-1"
                                >
                                    Adresse e-mail (identifiant)
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2 rounded
                             focus:outline-none focus:ring-2 focus:ring-teal-600"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md
                             text-gray-700 hover:bg-gray-100"
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-teal-600 text-white rounded-md
                             font-semibold hover:bg-teal-700"
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
