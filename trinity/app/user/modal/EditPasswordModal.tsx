"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateUserPassword } from "@/lib/server-actions/users-actions";
import { CheckCircle, XCircle, Eye, EyeOff, Pencil } from "lucide-react";

type EditPasswordModalProps = {
    userId: string;
};

export default function EditPasswordModal({ userId }: EditPasswordModalProps) {
    const [open, setOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [isPasswordMatch, setIsPasswordMatch] = useState(false);

    const [touchedNewPassword, setTouchedNewPassword] = useState(false);
    const [touchedConfirmPassword, setTouchedConfirmPassword] = useState(false);

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const router = useRouter();

    function openModal() {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
        setIsPasswordValid(false);
        setIsPasswordMatch(false);
        setTouchedNewPassword(false);
        setTouchedConfirmPassword(false);
        setOpen(true);
    }

    function closeModal() {
        setOpen(false);
    }

    function validatePassword(password: string) {
        const regex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        return regex.test(password);
    }

    function handlePasswordChange(value: string) {
        setNewPassword(value);
        const valid = validatePassword(value);
        setIsPasswordValid(valid);
        setIsPasswordMatch(value === confirmPassword);
    }

    function handleConfirmPasswordChange(value: string) {
        setConfirmPassword(value);
        setIsPasswordMatch(value === newPassword);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (!currentPassword) {
            setError("Veuillez entrer votre ancien mot de passe.");
            return;
        }

        if (!isPasswordValid) {
            setError("Le nouveau mot de passe ne respecte pas les critères de sécurité.");
            return;
        }

        if (!isPasswordMatch) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        try {
            await updateUserPassword(userId, currentPassword, newPassword);
            closeModal();
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue.");
        }
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
                            onClick={closeModal}
                            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            ✕
                        </button>

                        <h2 className="mb-2 pr-10 text-xl font-black">
                            Modifier mon mot de passe
                        </h2>

                        <p className="mb-5 text-sm text-muted-foreground">
                            Veuillez entrer votre ancien mot de passe et confirmer le nouveau.
                        </p>

                        {error && (
                            <div className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-bold">
                                    Ancien mot de passe
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="relative">
                                <label className="mb-1.5 block text-sm font-bold">
                                    Nouveau mot de passe
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        required
                                        value={newPassword}
                                        onChange={(e) => handlePasswordChange(e.target.value)}
                                        onBlur={() => setTouchedNewPassword(true)}
                                        className={`h-11 w-full rounded-xl border bg-white ${touchedNewPassword && !isPasswordValid ? 'border-red-500' : isPasswordValid ? 'border-green-500' : 'border-input'} px-3 pr-16 text-sm outline-none focus:ring-2 focus:ring-primary/20`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                    >
                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>

                                    {touchedNewPassword && isPasswordValid && (
                                        <CheckCircle className="absolute right-10 top-3 text-green-500" size={20} />
                                    )}
                                    {touchedNewPassword && !isPasswordValid && newPassword && (
                                        <XCircle className="absolute right-10 top-3 text-red-500" size={20} />
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Le mot de passe doit contenir au moins :
                                    <br />- 8 caractères, une majuscule et un chiffre.
                                </p>
                            </div>

                            <div className="relative">
                                <label className="mb-1.5 block text-sm font-bold">
                                    Confirmer le nouveau mot de passe
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                                        onBlur={() => setTouchedConfirmPassword(true)}
                                        className={`h-11 w-full rounded-xl border bg-white ${touchedConfirmPassword && !isPasswordMatch ? 'border-red-500' : isPasswordMatch ? 'border-green-500' : 'border-input'} px-3 pr-16 text-sm outline-none focus:ring-2 focus:ring-primary/20`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>

                                    {touchedConfirmPassword && isPasswordMatch && (
                                        <CheckCircle className="absolute right-10 top-3 text-green-500" size={20} />
                                    )}
                                    {touchedConfirmPassword && !isPasswordMatch && confirmPassword && (
                                        <XCircle className="absolute right-10 top-3 text-red-500" size={20} />
                                    )}
                                </div>
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
                                    className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
                                        isPasswordValid && isPasswordMatch && currentPassword
                                            ? "bg-primary text-primary-foreground hover:bg-brand-dark"
                                            : "cursor-not-allowed bg-muted text-muted-foreground"
                                    }`}
                                    disabled={!isPasswordValid || !isPasswordMatch || !currentPassword}
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
