"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/lib/server-actions/users-actions";
import { signOut } from "next-auth/react";
import { Trash2 } from "lucide-react";

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
            <button type="button" onClick={openModal} className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-4 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10">
                <Trash2 size={15} aria-hidden />
                Supprimer mon compte
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
                        <button
                            onClick={closeModal}
                            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            ✕
                        </button>

                        <h2 className="mb-2 pr-10 text-xl font-black">
                            Supprimer mon compte
                        </h2>

                        <p className="mb-4 text-sm text-muted-foreground">
                            Êtes-vous sûr de vouloir supprimer votre compte ? <br />
                            Cette action est <strong>irréversible</strong>.
                        </p>

                        {error && <div className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</div>}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                className="rounded-full border px-5 py-2.5 text-sm font-bold transition-colors hover:bg-muted"
                            >
                                Annuler
                            </button>

                            <button
                                onClick={handleDelete}
                                className="rounded-full bg-destructive px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-destructive/90"
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
