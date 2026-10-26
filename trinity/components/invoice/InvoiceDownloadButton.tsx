"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { generateInvoice } from "@/lib/server-actions/orders-actions";

interface InvoiceDownloadButtonProps {
    orderId: string;
}

export default function InvoiceDownloadButton({ orderId }: InvoiceDownloadButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const downloadInvoice = async () => {
        setLoading(true);
        setError(false);
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
        } catch (err) {
            console.error("Erreur lors du téléchargement de la facture :", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <button
                type="button"
                onClick={downloadInvoice}
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-primary px-5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
            >
                {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />}
                {loading ? "Préparation de la facture…" : "Télécharger la facture (PDF)"}
            </button>
            {error && (
                <p role="alert" className="mt-2 text-center text-xs font-semibold text-destructive">
                    La facture n’a pas pu être générée. Réessayez.
                </p>
            )}
        </div>
    );
}
