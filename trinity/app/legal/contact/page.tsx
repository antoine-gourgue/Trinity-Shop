'use client';

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const toggleAccordion = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    const contactInfos = [
        {
            title: "Adresse email",
            content: (
                <a href="mailto:contact@trinity.com" className="text-teal-600 hover:underline">
                    contact@trinity.com
                </a>
            ),
            icon: <Mail className="text-teal-600" size={20} />,
        },
        {
            title: "Téléphone",
            content: (
                <a href="tel:+33123456789" className="text-teal-600 hover:underline">
                    01 23 45 67 89
                </a>
            ),
            icon: <Phone className="text-teal-600" size={20} />,
        },
        {
            title: "Adresse",
            content: "20 rue de l'Innovation, 75001 Paris",
            icon: <MapPin className="text-teal-600" size={20} />,
        },
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                <Link href="/" className="hover:underline text-gray-700 font-medium">Accueil</Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-teal-600 font-medium">Contact</span>
            </nav>

            <div className="bg-gray-50 rounded-lg border p-6">
                <div className="inline-block bg-yellow-400 px-3 py-1 rounded-sm shadow-md transform -rotate-3 mb-4">
                    <span className="font-bold text-black">Information</span>
                </div>

                <h1 className="text-3xl font-bold text-teal-700 mb-4">Nous contacter</h1>
                <p className="text-gray-600">
                    Retrouvez toutes les informations pour nous contacter facilement.
                </p>

                <div className="mt-6 space-y-4">
                    {contactInfos.map((info, index) => (
                        <div key={index} className="border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                className={`w-full flex justify-between items-center p-4 text-left ${activeIndex === index ? 'bg-teal-100' : 'bg-white'}`}
                                onClick={() => toggleAccordion(index)}
                            >
                                <div className="flex items-center gap-3">
                                    {info.icon}
                                    <span className="font-semibold text-gray-800">{info.title}</span>
                                </div>
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
                                    <p>{info.content}</p>
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
