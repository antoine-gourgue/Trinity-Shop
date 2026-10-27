import { Resend } from "resend";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { loadInvoice } from "@/lib/invoice-data";
import { siteUrl } from "@/lib/site-url";
import { OrderConfirmationEmail } from "@/components/emails/order-confirmation-email";
import { OrderStatusEmail } from "@/components/emails/order-status-email";
import type { RefundOutcome } from "@/lib/payments/refund";

import { emailSender } from "@/lib/email-sender";

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
      from: emailSender(),
      to: [invoice.email],
      subject: `Commande n° ${number} confirmée`,
      react: OrderConfirmationEmail({
        firstName: invoice.firstName,
        invoice: invoice.data,
        total: invoice.total,
        orderUrl: `${siteUrl()}/user/${invoice.userId}/order/${orderId}`,
        siteUrl: siteUrl(),
      }),
      attachments: [{ filename: `Facture-Trinity-${number}.pdf`, content: pdf }],
    });
    if (error) console.error("E-mail de confirmation non envoyé :", error);
  } catch (err) {
    console.error("E-mail de confirmation non envoyé :", err);
  }
}

export type OrderStatusEvent = { status: "ready" } | { status: "cancelled"; refund: RefundOutcome };

// Prévient le client quand sa commande est prête (drive ou livraison) ou annulée, envoyé « au mieux »
export async function sendOrderStatusEmail(orderId: string, event: OrderStatusEvent) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const invoice = await loadInvoice(orderId);
    if (!invoice) return;

    const { data } = invoice;
    const number = data.orderNumber;
    const common = {
      firstName: invoice.firstName,
      orderNumber: number,
      pickupLabel: data.pickupLabel,
      deliveryAddress: data.delivery ? data.delivery.address.join(", ") : null,
      articleCount: data.items.reduce((acc, item) => acc + item.quantity, 0),
      orderUrl: `${siteUrl()}/user/${invoice.userId}/order/${orderId}`,
      siteUrl: siteUrl(),
    };
    const email =
      event.status === "ready"
        ? {
            subject: data.delivery ? `Votre commande n° ${number} est en route` : `Votre commande n° ${number} est prête au drive`,
            react: OrderStatusEmail({ ...common, status: "ready" }),
          }
        : {
            subject: `Votre commande n° ${number} a été annulée`,
            react: OrderStatusEmail({
              ...common,
              status: "cancelled",
              refundedAmount: event.refund.refunded ? event.refund.amount : null,
              vouchersReturned: data.loyalty.pointsUsed > 0,
            }),
          };

    const { error } = await new Resend(apiKey).emails.send({ from: emailSender(), to: [invoice.email], ...email });
    if (error) console.error("E-mail de suivi non envoyé :", error);
  } catch (err) {
    console.error("E-mail de suivi non envoyé :", err);
  }
}
