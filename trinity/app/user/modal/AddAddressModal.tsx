"use client";

import { useState, FormEvent } from "react";
import { createUserAddress } from "@/lib/server-actions/users-actions";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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
            <button type="button" onClick={openModal} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark">
                <Plus size={16} aria-hidden />
                Ajouter une adresse
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
                            Ajouter une adresse
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-bold">Rue</label>
                                <input
                                    type="text"
                                    required
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="mb-1.5 block text-sm font-bold">
                                        Code postal
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={zipCode}
                                        onChange={(e) => setZipCode(e.target.value)}
                                        className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="mb-1.5 block text-sm font-bold">
                                        Ville
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-bold">Pays</label>
                                <input
                                    type="text"
                                    required
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-bold">
                                    Type d’adresse
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as "domicile" | "livraison")}
                                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="domicile">Domicile</option>
                                    <option value="livraison">Livraison</option>
                                </select>
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
