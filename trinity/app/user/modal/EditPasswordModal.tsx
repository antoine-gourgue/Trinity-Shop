"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateUserPassword } from "@/lib/server-actions/users-actions";
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

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
            <button onClick={openModal} className="text-teal-700 hover:underline">
                Modifier
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
                            Modifier mon mot de passe
                        </h2>

                        <p className="text-gray-700 text-sm mb-5">
                            Veuillez entrer votre ancien mot de passe et confirmer le nouveau.
                        </p>

                        {error && (
                            <div className="text-red-600 text-sm mb-3">{error}</div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block font-semibold text-gray-800 mb-1">
                                    Ancien mot de passe
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-teal-600"
                                />
                            </div>

                            <div className="relative">
                                <label className="block font-semibold text-gray-800 mb-1">
                                    Nouveau mot de passe
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        required
                                        value={newPassword}
                                        onChange={(e) => handlePasswordChange(e.target.value)}
                                        onBlur={() => setTouchedNewPassword(true)}
                                        className={`w-full border ${touchedNewPassword && !isPasswordValid ? 'border-red-500' : isPasswordValid ? 'border-green-500' : 'border-gray-300'} px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-teal-600`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-2.5 text-gray-600 hover:text-black"
                                    >
                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>

                                    {touchedNewPassword && isPasswordValid && (
                                        <CheckCircle className="absolute right-10 top-2.5 text-green-500" size={20} />
                                    )}
                                    {touchedNewPassword && !isPasswordValid && newPassword && (
                                        <XCircle className="absolute right-10 top-2.5 text-red-500" size={20} />
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Le mot de passe doit contenir au moins :
                                    <br />- 8 caractères, une majuscule et un chiffre.
                                </p>
                            </div>

                            <div className="relative">
                                <label className="block font-semibold text-gray-800 mb-1">
                                    Confirmer le nouveau mot de passe
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                                        onBlur={() => setTouchedConfirmPassword(true)}
                                        className={`w-full border ${touchedConfirmPassword && !isPasswordMatch ? 'border-red-500' : isPasswordMatch ? 'border-green-500' : 'border-gray-300'} px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-teal-600`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-2.5 text-gray-600 hover:text-black"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>

                                    {touchedConfirmPassword && isPasswordMatch && (
                                        <CheckCircle className="absolute right-10 top-2.5 text-green-500" size={20} />
                                    )}
                                    {touchedConfirmPassword && !isPasswordMatch && confirmPassword && (
                                        <XCircle className="absolute right-10 top-2.5 text-red-500" size={20} />
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    className={`px-4 py-2 rounded-md font-semibold ${
                                        isPasswordValid && isPasswordMatch && currentPassword
                                            ? "bg-teal-600 text-white hover:bg-teal-700"
                                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
