'use client';
import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function TrinityLoyaltyProgram() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const toggleAccordion = (index: number) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    const sections = [
        {
            title: "Qu'est-ce que la carte de fidélité « Carte Trinity » ?",
            content: "La carte de fidélité « Carte Trinity » est une carte à code-barres proposée par la société Trinity. Elle permet aux clients de cumuler des points de fidélité lors de leurs achats dans les magasins partenaires Trinity et de bénéficier d'offres exclusives."
        },
        {
            title: "Comment adhérer au programme de fidélité ?",
            content: "Pour adhérer au programme de fidélité Trinity, il vous suffit de demander votre carte en magasin ou de vous inscrire en ligne sur notre site officiel. La carte est gratuite et accessible à tous les clients majeurs."
        },
        {
            title: "Comment bénéficier de mes avantages Carte Trinity ?",
            content: "Présentez votre Carte Trinity à chaque passage en caisse ou renseignez votre numéro de carte lors de vos achats en ligne. Cumulez des points et profitez d'offres spéciales tout au long de l'année."
        },
        {
            title: "Quelles sont les règles d'attribution des avantages Carte Trinity ?",
            content: "Les points de fidélité sont attribués sur chaque achat effectué dans un magasin partenaire. Certains produits ou périodes promotionnelles permettent de cumuler des points supplémentaires."
        },
        {
            title: "Comment utiliser mes points Carte Trinity ?",
            content: "Les points cumulés peuvent être utilisés pour obtenir des remises sur vos prochains achats ou pour accéder à des offres exclusives. Présentez simplement votre carte lors du paiement."
        },
        {
            title: "Combien de temps ma Carte Trinity est-elle valable ?",
            content: "La Carte Trinity est valable sans limitation de durée. Toutefois, un compte inactif depuis plus de 13 mois sera désactivé, et les points non utilisés seront perdus."
        },
        {
            title: "Que faire en cas de perte ou de vol de ma Carte Trinity ?",
            content: "En cas de perte ou de vol, signalez-le immédiatement en magasin ou via votre espace client en ligne. Une nouvelle carte vous sera remise et vos points seront transférés."
        },
        {
            title: "Protection de vos données personnelles",
            content: "Les informations collectées lors de votre inscription sont utilisées uniquement pour la gestion du programme de fidélité Trinity. Conformément à la législation en vigueur, vous disposez d'un droit d'accès, de modification et de suppression de vos données."
        },
        {
            title: "Modification des conditions générales du programme",
            content: "Trinity se réserve le droit de modifier à tout moment les conditions du programme de fidélité. Les adhérents seront informés de toute modification par email ou via leur espace client en ligne."
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                <Link href="/" className="hover:underline text-gray-700 font-medium">Accueil</Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-teal-600 font-medium">Programme de fidélité Trinity</span>
            </nav>

            <div className="bg-gray-50 rounded-lg border p-6">
            <div className="inline-block bg-yellow-400 px-3 py-1 rounded-sm shadow-md transform -rotate-3 mb-4">
                <span className="font-bold text-black">Information</span>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-teal-700 mb-2">Programme de fidélité Carte Trinity</h1>
                <p className="text-gray-600">
                    Rejoignez le programme de fidélité Trinity et profitez d'avantages exclusifs tout en cumulant des points à chaque achat.
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
