'use client';
import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function InformationsCookies() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const toggleAccordion = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    const sections = [
        {
            title: "Qu'est-ce qu'un cookie ?",
            content: "Un cookie est un petit fichier texte envoyé par un site web et stocké sur votre appareil. Il permet de mémoriser des informations concernant votre navigation, comme vos préférences ou votre statut de connexion."
        },
        {
            title: "Pourquoi utilisons-nous des cookies ?",
            content: "Les cookies sont utilisés pour assurer le bon fonctionnement du site, améliorer votre expérience utilisateur, mesurer l’audience et proposer des publicités personnalisées."
        },
        {
            title: "Les types de cookies que nous utilisons",
            content: (
                <div>
                    <p className="mb-2">Voici les principaux types de cookies utilisés :</p>
                    <ul className="list-disc pl-5">
                        <li><strong>Cookies techniques :</strong> nécessaires au bon fonctionnement du site.</li>
                        <li><strong>Cookies de personnalisation :</strong> pour améliorer votre expérience utilisateur.</li>
                        <li><strong>Cookies analytiques :</strong> pour mesurer les performances et l'audience du site.</li>
                        <li><strong>Cookies publicitaires :</strong> pour personnaliser les publicités en fonction de vos centres d'intérêt.</li>
                    </ul>
                </div>
            )
        },
        {
            title: "Tableau des cookies",
            content: (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                        <thead>
                        <tr className="bg-gray-100">
                            <th className="py-2 px-4 border-b">Nom du cookie</th>
                            <th className="py-2 px-4 border-b">Partenaire</th>
                            <th className="py-2 px-4 border-b">Durée de vie</th>
                            <th className="py-2 px-4 border-b">Finalité</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td className="py-2 px-4 border-b">JSESSIONID</td>
                            <td className="py-2 px-4 border-b">MagasinsU</td>
                            <td className="py-2 px-4 border-b">Session</td>
                            <td className="py-2 px-4 border-b">Stocke la session de l'utilisateur.</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-4 border-b">AEC</td>
                            <td className="py-2 px-4 border-b">Google</td>
                            <td className="py-2 px-4 border-b">6 mois</td>
                            <td className="py-2 px-4 border-b">Empêche le spam et les fraudes.</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-4 border-b">_fbp</td>
                            <td className="py-2 px-4 border-b">Facebook</td>
                            <td className="py-2 px-4 border-b">3 mois</td>
                            <td className="py-2 px-4 border-b">Publicités ciblées sur Facebook.</td>
                        </tr>
                        <tr>
                            <td className="py-2 px-4 border-b">IDE</td>
                            <td className="py-2 px-4 border-b">Google DoubleClick</td>
                            <td className="py-2 px-4 border-b">13 mois</td>
                            <td className="py-2 px-4 border-b">Suivi des performances des publicités.</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            )
        },
        {
            title: "Comment gérer les cookies ?",
            content: "Vous pouvez configurer votre navigateur pour accepter ou refuser les cookies. Vous avez également la possibilité de supprimer les cookies existants via les paramètres de votre navigateur."
        },
        {
            title: "Comment contacter le délégué à la protection des données ?",
            content: "Pour toute question relative aux cookies ou à la protection de vos données personnelles, vous pouvez contacter notre Délégué à la Protection des Données à l'adresse suivante : contact_donnees@trinity.com."
        }
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                <Link href="/" className="hover:underline text-gray-700 font-medium">Accueil</Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-teal-600 font-medium">Informations sur les cookies</span>
            </nav>

            <div className="bg-gray-50 rounded-lg border p-6">
                <div className="inline-block bg-yellow-400 px-3 py-1 rounded-sm shadow-md transform -rotate-3 mb-4">
                    <span className="font-bold text-black">Information</span>
                </div>

                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-teal-700 mb-2">Informations sur les cookies</h1>
                    <p className="text-gray-600">
                        Cette page vous informe sur l'utilisation des cookies et vous aide à comprendre comment vous pouvez les gérer ou les désactiver.
                    </p>
                </div>

                <div className="space-y-4">
                    {sections.map((section, index) => (
                        <div key={index} className="border border-gray-300 rounded-lg overflow-hidden">
                            <button
                                className={`w-full flex justify-between items-center p-4 text-left ${activeIndex === index ? 'bg-teal-100' : 'bg-white'}`}
                                onClick={() => toggleAccordion(index)}
                            >
                                <span className="font-semibold text-gray-800">{section.title}</span>
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
                                    {typeof section.content === 'string' ? <p>{section.content}</p> : section.content}
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
