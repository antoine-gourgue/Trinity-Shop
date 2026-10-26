import { generateInvoice } from "@/lib/server-actions/orders-actions";

// Génère la facture PDF d'une commande côté serveur et la télécharge dans le navigateur
export async function downloadInvoice(orderId: string) {
  const pdfBase64 = await generateInvoice(orderId);
  const pdfBlob = new Blob([Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0))], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Facture-Trinity-${orderId.slice(-8).toUpperCase()}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
