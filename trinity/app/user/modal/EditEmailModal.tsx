"use client";

import { FormEvent, useState } from "react";
import { updateUserEmail } from "@/lib/server-actions/users-actions";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

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
            <button type="button" onClick={openModal} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-secondary">
                <Pencil size={15} aria-hidden />
                Modifier
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            ✕
                        </button>

                        <h2 className="mb-2 pr-10 text-xl font-black">
                            Modifier mon e-mail
                        </h2>

                        <p className="mb-5 text-sm text-muted-foreground">
                            En cliquant sur « Enregistrer », votre nouvelle adresse e-mail sera mise à jour si elle n’est pas déjà utilisée.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-1.5 block text-sm font-bold"
                                >
                                    Adresse e-mail (identifiant)
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-full border px-5 py-2.5 text-sm font-bold transition-colors hover:bg-muted"
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
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
