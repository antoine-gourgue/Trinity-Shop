"use client";

import { useRouter } from "next/navigation";
import { FaTimes } from "react-icons/fa";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const handleLogin = () => {
        router.push("/api/auth/signin");
    };

    const handleSignup = () => {
        router.push("/auth");
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-2xl shadow-lg w-80 p-6 relative animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-teal-600 hover:text-teal-800"
                >
                    <FaTimes size={20} />
                </button>

                <h2 className="text-xl font-bold text-center mb-4">Se connecter</h2>

                <p className="text-center text-gray-700 mb-6">
                    Votre compte vous permet de réserver votre créneau, accéder à vos listes et
                    profiter de nos services personnalisés.
                </p>

                <button
                    onClick={handleLogin}
                    className="bg-teal-600 text-white w-full py-3 rounded-full text-lg font-medium hover:bg-teal-700 transition"
                >
                    Se connecter
                </button>

                <p className="text-center mt-4 text-gray-800">
                    Nouveau client ?{" "}
                    <span
                        onClick={handleSignup}
                        className="text-teal-600 hover:underline cursor-pointer"
                    >
                        S’inscrire
                    </span>
                </p>
            </div>
        </div>
    );
}
