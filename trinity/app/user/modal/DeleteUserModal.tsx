"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/lib/server-actions/users-actions";
import { signOut } from "next-auth/react";

type DeleteUserModalProps = {
    userId: string;
};

export default function DeleteUserModal({ userId }: DeleteUserModalProps) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    function openModal() {
        setOpen(true);
    }

    function closeModal() {
        setOpen(false);
    }

    async function handleDelete() {
        const res = await deleteUser(userId);

        if (res.success) {
            await signOut({ redirect: false });
            router.push("/");
        } else {
            setError(res.message || "Erreur lors de la suppression.");
        }
    }

    return (
        <>
            <button onClick={openModal} className="text-teal-700 hover:underline">
                Je supprime mon compte
            </button>

            {open && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
                    <div className="bg-white rounded-lg max-w-sm w-full p-6 relative">
                        <button
                            onClick={closeModal}
                            className="absolute top-3 right-3 text-gray-600 hover:text-black"
                        >
                            ✕
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Supprimer mon compte
                        </h2>

                        <p className="text-gray-700 mb-4">
                            Êtes-vous sûr de vouloir supprimer votre compte ? <br />
                            Cette action est <strong>irréversible</strong>.
                        </p>

                        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

                        <div className="flex justify-end gap-4">
                            <button
                                onClick={closeModal}
                                className="border border-gray-300 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                            >
                                Annuler
                            </button>

                            <button
                                onClick={handleDelete}
                                className="bg-red-600 text-white px-5 py-2 rounded-md font-semibold hover:bg-red-700"
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
