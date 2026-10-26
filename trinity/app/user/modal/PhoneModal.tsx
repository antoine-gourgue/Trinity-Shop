"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { setUserPhone, deleteUserPhone } from "@/lib/server-actions/users-actions";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
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
                <button type="button" onClick={openAddEditModal} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark">
                    <PlusCircle size={16} aria-hidden />
                    Ajouter un numéro
                </button>

                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
                            <button
                                onClick={closeModal}
                                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                ✕
                            </button>

                            <h2 className="mb-2 pr-10 text-xl font-black">
                                Ajouter un numéro
                            </h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-bold">
                                        Numéro de téléphone
                                    </label>
                                    <PhoneInput
                                        country={"fr"}
                                        value={phoneValue}
                                        onChange={(value) => setPhoneValue(value)}
                                        containerStyle={{ marginTop: "0.25rem" }}
                                        inputStyle={{ width: "100%", height: 44, borderRadius: 12 }}
                                        buttonStyle={{ borderRadius: "12px 0 0 12px" }}
                                    />
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
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

    return (
        <>
            <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={openAddEditModal} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-secondary">
                    <Pencil size={15} aria-hidden />
                    Modifier
                </button>
                <button type="button" onClick={openDeleteModal} className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-4 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10">
                    <Trash2 size={15} aria-hidden />
                    Supprimer
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
                        <button
                            onClick={closeModal}
                            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            ✕
                        </button>

                        {mode === "add-edit" ? (
                            <>
                                <h2 className="mb-2 pr-10 text-xl font-black">
                                    Modifier mon numéro
                                </h2>
                                <form onSubmit={handleSave} className="space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-bold">
                                            Numéro de téléphone
                                        </label>
                                        <PhoneInput
                                            country={"fr"}
                                            value={phoneValue}
                                            onChange={(value) => setPhoneValue(value)}
                                            containerStyle={{ marginTop: "0.25rem" }}
                                        inputStyle={{ width: "100%", height: 44, borderRadius: 12 }}
                                        buttonStyle={{ borderRadius: "12px 0 0 12px" }}
                                        />
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={closeModal}
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
                            </>
                        ) : (
                            <>
                                <h2 className="mb-2 pr-10 text-xl font-black">
                                    Supprimer mon numéro
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Êtes-vous sûr de vouloir supprimer ce numéro&nbsp;?
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
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
