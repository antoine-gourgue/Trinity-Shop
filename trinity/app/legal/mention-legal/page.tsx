'use client';

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function MentionsLegales() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                <Link href="/" className="hover:underline text-gray-700 font-medium">Accueil</Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-teal-600 font-medium">Mentions légales</span>
            </nav>

            <div className="w-full max-w-4xl mx-auto px-6 py-8 rounded-lg shadow-md border border-gray-200">

                <div className="flex justify-center mb-4">
                    <span className="bg-yellow-400 text-black px-3 py-1 rounded-sm font-bold text-sm shadow-md transform -rotate-2">
                        Information
                    </span>
                </div>

                <h1 className="text-3xl font-bold text-black text-center mb-6">Mentions légales</h1>

                <div className="text-center space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left md:text-center">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">Le site</h2>
                            <p>Le site <strong>www.trinity.com</strong> est la propriété de <strong>Trinity Corp</strong>, éditeur du site.</p>
                            <p className="mt-2"><strong>Trinity Corp</strong></p>
                            <p>Société Anonyme à capital variable</p>
                            <p>20 rue de l'Innovation, 75001 Paris</p>
                            <p>SIRET : 123 456 789 00010</p>
                            <p>TVA : FR 12 123 456 789</p>
                            <p>Téléphone : 01 23 45 67 89</p>
                            <p>Email : <a href="mailto:contact@trinity.com" className="text-teal-600 underline hover:text-teal-800">contact@trinity.com</a></p>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold mb-2">Site hébergé par</h2>
                            <p><strong>OVHcloud</strong></p>
                            <p>2 rue Kellermann, 59100 Roubaix, France</p>
                            <p>Téléphone : 09 72 10 10 07</p>

                            <p className="mt-4"><strong>Directeur de la publication :</strong></p>
                            <p>Jean Dupont, Président Directeur Général de <strong>Trinity Corp</strong></p>
                        </div>
                    </div>

                    <hr className="my-6 border-gray-300" />

                    <section className="mb-6">
                        <h2 className="text-2xl font-semibold text-teal-600 mb-2">1. Propriété intellectuelle</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Le site <strong>www.trinity.com</strong> et l'ensemble de son contenu (textes, images, logos, etc.)
                            sont protégés par les lois en vigueur sur la propriété intellectuelle et sont la propriété exclusive de <strong>Trinity Corp</strong>.
                        </p>
                    </section>

                    <section className="mb-6">
                        <h2 className="text-2xl font-semibold text-teal-600 mb-2">2. Connexion et accessibilité au site</h2>
                        <p className="text-gray-700 leading-relaxed">
                            <strong>Trinity Corp</strong> s’efforce de maintenir accessible le site <strong>www.trinity.com</strong>. Toutefois,
                            sa responsabilité ne saurait être engagée en cas d’interruption de service pour des raisons techniques ou de maintenance.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-teal-600 mb-2">3. Crédits photos</h2>
                        <p className="text-gray-700 leading-relaxed">Photos par : Unsplash, Pexels, Shutterstock</p>
                    </section>

                    <div className="text-center mt-10 text-sm text-gray-500">
                        Dernière mise à jour : <strong>{new Date().toLocaleDateString('fr-FR')}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}
