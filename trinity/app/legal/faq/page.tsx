'use client';

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, HelpCircle } from "lucide-react";

const faqs = [
    {
        question: "Quels sont vos horaires d'ouverture ?",
        answer: "Nous sommes ouverts du lundi au vendredi de 9h à 18h."
    },
    {
        question: "Livrez-vous à l'international ?",
        answer: "Oui, nous livrons dans plusieurs pays en Europe et à l'international."
    },
    {
        question: "Quels sont les moyens de paiement acceptés ?",
        answer: "Nous acceptons les cartes bancaires, PayPal et les virements bancaires."
    },
    {
        question: "Puis-je annuler ma commande après validation ?",
        answer: "Oui, tant que la commande n'a pas été expédiée. Contactez-nous rapidement."
    },
    {
        question: "Comment suivre ma commande ?",
        answer: "Un lien de suivi est envoyé par email après l'expédition de votre commande."
    }
];

export default function FAQPage() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const toggleAccordion = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                <Link href="/" className="hover:underline text-gray-700 font-medium">Accueil</Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-teal-600 font-medium">FAQ</span>
            </nav>

            <div className="bg-gray-50 rounded-lg border p-6">
                <div className="inline-block bg-yellow-400 px-3 py-1 rounded-sm shadow-md transform -rotate-3 mb-4">
                    <span className="font-bold text-black">Information</span>
                </div>

                <h1 className="text-3xl font-bold text-teal-700 mb-4 flex items-center gap-2">
                    <HelpCircle size={28} className="text-teal-600" /> FAQ
                </h1>
                <p className="text-gray-600">
                    Retrouvez ici les réponses aux questions les plus fréquemment posées.
                </p>

                <div className="mt-6 space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={index} className="border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                className={`w-full flex justify-between items-center p-4 text-left ${activeIndex === index ? 'bg-teal-100' : 'bg-white'}`}
                                onClick={() => toggleAccordion(index)}
                            >
                                <span className="font-semibold text-gray-800">{faq.question}</span>
                                <svg
                                    className={`w-5 h-5 transform transition-transform ${activeIndex === index ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {activeIndex === index && (
                                <div className="p-4 text-gray-700 border-t border-gray-300">
                                    <p>{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        Dernière mise à jour : <strong>{new Date().toLocaleDateString('fr-FR')}</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}
