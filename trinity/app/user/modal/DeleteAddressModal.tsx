"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
                type="button"
                onClick={openModal}
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-4 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
                <Trash2 size={15} aria-hidden />
                Supprimer
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
                            Supprimer l’adresse
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Êtes-vous sûr de vouloir supprimer cette adresse&nbsp;?
                            <br />
                            Cette action est irréversible.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
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
