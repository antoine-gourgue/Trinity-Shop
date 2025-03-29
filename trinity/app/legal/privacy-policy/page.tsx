'use client';
import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Page() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const toggleAccordion = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    const sections = [
        {
            title: "À qui s’adresse cette politique ?",
            content: "Cette Politique de Protection des Données Personnelles est destinée à informer tous nos clients, que leurs habitudes soient plutôt orientées sur le commerce à distance, l’utilisation des applications mobiles, la souscription des services en ligne ou qu’ils aient simplement souscrit à notre programme de fidélité Carte U, qu’ils soient adeptes de l’espace jeux, ou plus généralement tous les clients amenés à renseigner des informations personnelles."
        },
        {
            title: "Qu’est-ce qu’une « donnée personnelle » ?",
            content: "Une donnée personnelle est toute information relative à une personne physique identifiée ou identifiable, comme votre nom, prénom, adresse e-mail, adresse postale, ou encore votre numéro de carte de fidélité."
        },
        {
            title: "Quelles informations collectons-nous à travers nos sites internet ?",
            content: "Nous collectons des données telles que votre identification, vos préférences d'achat, vos informations bancaires, ainsi que vos données de navigation (adresse IP, cookies, etc.)."
        },
        {
            title: "Les données personnelles des personnes mineures",
            content: "Nous ne collectons pas intentionnellement de données concernant des personnes mineures. Si une telle collecte est portée à notre connaissance, nous supprimerons immédiatement ces informations."
        },
        {
            title: "Pourquoi avons-nous besoin de recueillir des informations sur nos clients ?",
            content: "Les données personnelles collectées nous permettent d’améliorer nos services, de personnaliser nos offres et de respecter nos obligations légales."
        },
        {
            title: "Est-ce que je peux m’opposer au traitement de mes données personnelles ?",
            content: "Vous avez le droit d’accéder, de rectifier et de supprimer vos données personnelles. Vous pouvez également vous opposer à certains traitements en contactant notre service dédié."
        },
        {
            title: "Quels sont les moyens mis en œuvre pour protéger vos données ?",
            content: "Nous mettons en place des mesures de sécurité strictes pour assurer la confidentialité et l’intégrité de vos données."
        },
        {
            title: "Vos données sont-elles transférées hors de l'Union Européenne ?",
            content: "Certaines données peuvent être transférées hors de l'UE dans le cadre de prestations techniques, en respectant les garanties légales requises."
        },
        {
            title: "Combien de temps conservons-nous vos données personnelles ?",
            content: "Vos données sont conservées pendant la durée nécessaire à la réalisation des finalités pour lesquelles elles ont été collectées, puis sont archivées ou supprimées selon les obligations légales."
        },
        {
            title: "Modifications de la politique de protection des données personnelles",
            content: "Nous nous réservons le droit de modifier cette politique à tout moment. Les modifications seront publiées sur cette page."
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                <Link href="/" className="hover:underline text-gray-700 font-medium">Accueil</Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-teal-600 font-medium">Protection des données personnelles</span>
            </nav>

            <div className="bg-gray-50 rounded-lg border p-6">
                <div className="inline-block bg-yellow-400 px-3 py-1 rounded-sm shadow-md transform -rotate-3 mb-4">
                    <span className="font-bold text-black">Information</span>
                </div>

                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-teal-700 mb-2">Politique de protection des données personnelles</h1>
                    <p className="text-gray-600">
                        Nous nous engageons à protéger vos données personnelles et à vous offrir un service transparent concernant leur collecte et leur utilisation.
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
                                    <p>{section.content}</p>
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
