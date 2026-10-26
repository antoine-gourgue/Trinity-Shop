import { Resend } from "resend";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { loadInvoice } from "@/lib/invoice-data";
import { siteUrl } from "@/lib/site-url";
import { OrderConfirmationEmail } from "@/components/emails/order-confirmation-email";

// E-mail de confirmation avec la facture en pièce jointe, envoyé « au mieux » :
// sans clé Resend ou en cas d'échec, la commande reste valide
export async function sendOrderConfirmation(orderId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const invoice = await loadInvoice(orderId);
    if (!invoice) return;

    const pdf = await buildInvoicePdf(invoice.data);
    const number = invoice.data.orderNumber;
    const { error } = await new Resend(apiKey).emails.send({
      from: "Trinity <no-reply@pioupiou.tech>",
      to: [invoice.email],
      subject: `Commande n° ${number} confirmée`,
      react: OrderConfirmationEmail({
        firstName: invoice.firstName,
        invoice: invoice.data,
        total: invoice.total,
        orderUrl: `${siteUrl()}/user/${invoice.userId}/order/${orderId}`,
      }),
      attachments: [{ filename: `Facture-Trinity-${number}.pdf`, content: pdf }],
    });
    if (error) console.error("E-mail de confirmation non envoyé :", error);
  } catch (err) {
    console.error("E-mail de confirmation non envoyé :", err);
  }
}
