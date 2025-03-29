"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AlertTriangle } from "lucide-react";

export default function MaintenancePage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                <Link href="/" className="hover:underline text-gray-700 font-medium">Accueil</Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-teal-600 font-medium">Maintenance</span>
            </nav>

            <div className="w-full max-w-4xl mx-auto px-6 py-8 rounded-lg shadow-md border border-gray-200 text-center bg-white">

                <div className="flex justify-center mb-4">
                    <span className="bg-yellow-400 text-black px-3 py-1 rounded-sm font-bold text-sm shadow-md transform -rotate-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Maintenance en cours
                    </span>
                </div>

                <h1 className="text-3xl font-bold text-black mb-6">Le page est temporairement en maintenance</h1>

                <p className="text-gray-700 leading-relaxed text-lg">
                    Nous effectuons actuellement des améliorations pour vous offrir une meilleure expérience. <br />
                    Merci de votre patience, nous serons de retour très bientôt !
                </p>

                <div className="mt-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="100"
                        height="100"
                        viewBox="0 0 26 26"
                        className="text-teal-500 mx-auto"
                        fill="currentColor"
                    >
                        <path d="M1.313 0L0 1.313l2.313 4l1.5-.22l9.156 9.157l-.781.75c-.4.4-.4 1.006 0 1.406l.406.407c.4.4 1.012.4 1.312 0L15.094 18c-.1.6 0 1.313.5 1.813L21 25.188c1.1 1.1 2.9 1.1 4 0c1.3-1.2 1.288-2.994.188-4.094l-5.375-5.407c-.5-.5-1.213-.7-1.813-.5L16.687 14c.3-.4.3-1.012 0-1.313l-.375-.374a.974.974 0 0 0-1.406 0l-.656.656l-9.156-9.156l.218-1.5l-4-2.313zm19.5.031C18.84-.133 16.224 1.175 15 2.312c-1.506 1.506-1.26 3.475-.063 5.376l-2.124 2.125l1.5 1.687c.8-.7 1.98-.7 2.78 0l.407.406l.094.094l.875-.875c1.808 1.063 3.69 1.216 5.125-.219c1.4-1.3 2.918-4.506 2.218-6.406L23 7.406c-.4.4-1.006.4-1.406 0L18.687 4.5a.974.974 0 0 1 0-1.406L21.595.188c-.25-.088-.5-.133-.782-.157m-11 12.469l-3.626 3.625A5.3 5.3 0 0 0 5 16c-2.8 0-5 2.2-5 5s2.2 5 5 5s5-2.2 5-5c0-.513-.081-1.006-.219-1.469l2.125-2.125l-.312-.406c-.8-.8-.794-2.012-.094-2.813L9.812 12.5zm7.75 4.563c.125 0 .243.024.343.125l5.907 5.906c.2.2.2.518 0 .718s-.52.2-.72 0l-5.905-5.906c-.2-.2-.2-.518 0-.718c.1-.1.25-.125.375-.125M5.688 18.405l1.906 1.907l-.688 2.593l-2.593.688l-1.907-1.907l.688-2.593z"/>
                    </svg>
                </div>

                <div className="mt-6">
                    <Link href="/" className="px-6 py-2 bg-teal-600 text-white rounded-md shadow-md hover:bg-teal-700 transition">
                        Retour à l'accueil
                    </Link>
                </div>

                <div className="text-center mt-10 text-sm text-gray-500">
                    Dernière mise à jour : <strong>{new Date().toLocaleDateString('fr-FR')}</strong>
                </div>
            </div>
        </div>
    );
}
