"use client";

import { generateInvoice } from "@/lib/server-actions/orders-actions";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InvoiceDownloadButtonProps {
    orderId: string;
}

export default function InvoiceDownloadButton({ orderId }: InvoiceDownloadButtonProps) {
    const [loading, setLoading] = useState(false);

    const downloadInvoice = async () => {
        setLoading(true); // Active le spinner
        try {
            const pdfBase64 = await generateInvoice(orderId);
            const pdfBlob = new Blob([Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0))], {
                type: "application/pdf",
            });

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Facture_Commande_${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Erreur lors du téléchargement de la facture :", error);
        } finally {
            setLoading(false); // Désactive le spinner
        }
    };

    return (
        <div className="relative">
            {/* Bouton de téléchargement */}
            <button
                onClick={downloadInvoice}
                className="bg-teal-600 text-white px-4 py-2 rounded-full text-sm hover:bg-teal-700 transition"
                disabled={loading}
            >
                Télécharger la facture
            </button>

            {/* Spinner en overlay lorsque `loading` est actif */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
