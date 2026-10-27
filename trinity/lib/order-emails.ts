import { Resend } from "resend";
import { buildInvoicePdf, type InvoiceData } from "@/lib/invoice-pdf";
import { loadInvoice } from "@/lib/invoice-data";
import { siteUrl } from "@/lib/site-url";
import { OrderConfirmationEmail } from "@/components/emails/order-confirmation-email";
import { OrderStatusEmail, type OrderStatusEmailProps } from "@/components/emails/order-status-email";
import type { RefundOutcome } from "@/lib/payments/refund";

import { emailSender } from "@/lib/email-sender";
import { arrivalUrl } from "@/lib/drive-links";

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

export type OrderStatusEvent = { status: "preparing" | "ready" | "completed" } | { status: "cancelled"; refund: RefundOutcome };

type StatusEmailBase = Omit<
  OrderStatusEmailProps,
  "status" | "refundedAmount" | "vouchersReturned" | "pointsEarned" | "preparation" | "arrivalUrl"
> & {
  pointsEarned: number;
  vouchersReturned: boolean;
  preparation: InvoiceData["preparation"];
  arrivalUrl: string | null;
};

// Objet et contenu de l'e-mail pour chaque changement de statut
function statusEmail(event: OrderStatusEvent, number: string, delivery: boolean, base: StatusEmailBase) {
  const { pointsEarned, vouchersReturned, preparation, arrivalUrl, ...common } = base;
  switch (event.status) {
    case "preparing":
      return { subject: `Votre commande n° ${number} est en préparation`, react: OrderStatusEmail({ ...common, status: "preparing" }) };
    case "ready":
      return {
        subject: delivery ? `Votre commande n° ${number} est en route` : `Votre commande n° ${number} est prête au drive`,
        react: OrderStatusEmail({ ...common, status: "ready", preparation, arrivalUrl }),
      };
    case "completed":
      return {
        subject: `Merci pour votre commande n° ${number}`,
        react: OrderStatusEmail({ ...common, status: "completed", pointsEarned }),
      };
    case "cancelled":
      return {
        subject: `Votre commande n° ${number} a été annulée`,
        react: OrderStatusEmail({
          ...common,
          status: "cancelled",
          refundedAmount: event.refund.refunded ? event.refund.amount : null,
          vouchersReturned,
        }),
      };
  }
}

// Prévient le client à chaque étape de sa commande (préparation, prête, retirée ou livrée) et en cas d'annulation, envoyé « au mieux »
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
      store: data.store ? { name: data.store.name, address: data.store.address.join(", ") } : null,
      articleCount: data.items.reduce((acc, item) => acc + item.quantity, 0),
      orderUrl: `${siteUrl()}/user/${invoice.userId}/order/${orderId}`,
      siteUrl: siteUrl(),
    };
    const email = statusEmail(event, number, Boolean(data.delivery), {
      ...common,
      pointsEarned: data.loyalty.pointsEarned,
      vouchersReturned: data.loyalty.pointsUsed > 0,
      preparation: data.preparation,
      arrivalUrl: data.delivery ? null : arrivalUrl(orderId),
    });

    const { error } = await new Resend(apiKey).emails.send({ from: emailSender(), to: [invoice.email], ...email });
    if (error) console.error("E-mail de suivi non envoyé :", error);
  } catch (err) {
    console.error("E-mail de suivi non envoyé :", err);
  }
}
