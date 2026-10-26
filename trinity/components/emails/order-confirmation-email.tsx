import { Button, Column, Hr, Row, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EmailLayout, emailStyles } from "@/components/emails/email-layout";
import type { InvoiceData } from "@/lib/invoice-pdf";
import { formatPrice } from "@/lib/format";

interface OrderConfirmationEmailProps {
  firstName: string;
  invoice: InvoiceData;
  total: number;
  orderUrl: string;
  siteUrl: string;
}

const priceCell = { ...emailStyles.text, margin: 0, textAlign: "right" as const, whiteSpace: "nowrap" as const };

// Confirmation envoyée après chaque commande, avec la facture en pièce jointe
export function OrderConfirmationEmail({ firstName, invoice, total, orderUrl, siteUrl }: OrderConfirmationEmailProps) {
  const fulfillment = invoice.delivery ? "Livraison à domicile" : "Retrait au drive Trinity U Rennes Epitech";

  return (
    <EmailLayout
      preview={`Commande n° ${invoice.orderNumber} confirmée`}
      siteUrl={siteUrl}
      reason="Vous recevez cet e-mail parce que vous avez passé une commande sur Trinity."
      hero={{
        label: `Commande n° ${invoice.orderNumber}`,
        title: `Merci ${firstName},`,
        highlight: "c’est commandé !",
        subtitle: "Nos équipes préparent vos courses pour le créneau choisi. Vous suivez la commande depuis votre espace client.",
      }}
    >

      <Section style={{ ...emailStyles.box, marginTop: 0 }}>
        <Text style={emailStyles.strong}>{fulfillment}</Text>
        {invoice.pickupLabel && <Text style={{ ...emailStyles.muted, margin: 0 }}>{invoice.pickupLabel}</Text>}
        {invoice.delivery && <Text style={{ ...emailStyles.muted, margin: 0 }}>{invoice.delivery.address.join(", ")}</Text>}
      </Section>

      {invoice.items.map((item) => (
        <Row key={item.name} style={{ marginBottom: 8 }}>
          <Column>
            <Text style={{ ...emailStyles.text, margin: 0 }}>
              <span style={{ color: EMAIL_COLORS.muted }}>{item.quantity} ×</span> {item.name}
            </Text>
          </Column>
          <Column style={{ width: 90 }}>
            <Text style={priceCell}>{formatPrice(item.price * item.quantity)}</Text>
          </Column>
        </Row>
      ))}

      <Hr style={{ borderColor: EMAIL_COLORS.border, margin: "14px 0" }} />
      {invoice.delivery && (
        <Row>
          <Column>
            <Text style={{ ...emailStyles.muted, margin: 0 }}>Livraison</Text>
          </Column>
          <Column style={{ width: 90 }}>
            <Text style={{ ...emailStyles.muted, margin: 0, textAlign: "right" }}>
              {invoice.delivery.fee === 0 ? "Offerte" : formatPrice(invoice.delivery.fee)}
            </Text>
          </Column>
        </Row>
      )}
      {invoice.loyalty.discount > 0 && (
        <Row>
          <Column>
            <Text style={{ ...emailStyles.muted, margin: 0 }}>Bons Carte Trinity</Text>
          </Column>
          <Column style={{ width: 90 }}>
            <Text style={{ ...emailStyles.muted, margin: 0, textAlign: "right" }}>– {formatPrice(invoice.loyalty.discount)}</Text>
          </Column>
        </Row>
      )}
      <Row style={{ marginTop: 8 }}>
        <Column>
          <Text style={{ ...emailStyles.text, fontSize: 17, fontWeight: 900, margin: 0 }}>Total payé</Text>
        </Column>
        <Column style={{ width: 110 }}>
          <Text style={{ ...priceCell, fontSize: 17, fontWeight: 900 }}>{formatPrice(total)}</Text>
        </Column>
      </Row>
      {invoice.loyalty.pointsEarned > 0 && (
        <Text style={{ ...emailStyles.muted, color: EMAIL_COLORS.brand, fontWeight: 700, margin: "6px 0 0", textAlign: "right" }}>
          + {invoice.loyalty.pointsEarned} points sur votre Carte Trinity
        </Text>
      )}

      <Section style={{ textAlign: "center", margin: "26px 0 10px" }}>
        <Button href={orderUrl} style={emailStyles.button}>
          Suivre ma commande
        </Button>
      </Section>
      <Text style={{ ...emailStyles.muted, textAlign: "center" }}>Votre facture est jointe à cet e-mail (PDF).</Text>
    </EmailLayout>
  );
}
