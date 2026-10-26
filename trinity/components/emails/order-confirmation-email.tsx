import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type * as React from "react";
import type { InvoiceData } from "@/lib/invoice-pdf";
import { formatPrice } from "@/lib/format";

interface OrderConfirmationEmailProps {
  firstName: string;
  invoice: InvoiceData;
  total: number;
  orderUrl: string;
}

const BRAND = "#00525e";

const styles = {
  body: { backgroundColor: "#f4f6f7", fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: "24px 0" },
  container: { backgroundColor: "#ffffff", borderRadius: 16, margin: "0 auto", maxWidth: 560, padding: 32 },
  heading: { color: BRAND, fontSize: 24, fontWeight: 800, margin: "0 0 8px" },
  text: { color: "#1f2933", fontSize: 15, lineHeight: "22px", margin: "0 0 12px" },
  muted: { color: "#5f6b76", fontSize: 13, lineHeight: "20px", margin: 0 },
  box: { backgroundColor: "#eef5f6", borderRadius: 12, padding: "12px 16px", margin: "16px 0" },
  item: { color: "#1f2933", fontSize: 14, lineHeight: "20px", margin: "0 0 6px" },
  total: { color: "#1f2933", fontSize: 17, fontWeight: 800, margin: "12px 0 0", textAlign: "right" },
  button: { backgroundColor: BRAND, borderRadius: 999, color: "#ffffff", display: "inline-block", fontSize: 15, fontWeight: 700, padding: "12px 24px", textDecoration: "none" },
} satisfies Record<string, React.CSSProperties>;

// Confirmation envoyée après chaque commande, avec la facture en pièce jointe
export function OrderConfirmationEmail({ firstName, invoice, total, orderUrl }: OrderConfirmationEmailProps) {
  const fulfillment = invoice.delivery
    ? `Livraison au ${invoice.delivery.address.join(", ")}`
    : "Retrait au drive Trinity U Rennes Epitech";

  return (
    <Html lang="fr">
      <Head />
      <Preview>{`Commande n° ${invoice.orderNumber} confirmée`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Merci {firstName} !</Heading>
          <Text style={styles.text}>
            Votre commande n° <strong>{invoice.orderNumber}</strong> est bien enregistrée. Nos équipes la préparent pour le
            créneau choisi.
          </Text>

          <Section style={styles.box}>
            <Text style={{ ...styles.item, fontWeight: 700 }}>{fulfillment}</Text>
            {invoice.pickupLabel && <Text style={styles.muted}>{invoice.pickupLabel}</Text>}
          </Section>

          {invoice.items.map((item) => (
            <Text key={item.name} style={styles.item}>
              {item.quantity} × {item.name} — {formatPrice(item.price * item.quantity)}
            </Text>
          ))}
          <Hr />
          {invoice.delivery && (
            <Text style={styles.muted}>
              Livraison : {invoice.delivery.fee === 0 ? "offerte" : formatPrice(invoice.delivery.fee)}
            </Text>
          )}
          {invoice.loyalty.discount > 0 && (
            <Text style={styles.muted}>Bons Carte Trinity : – {formatPrice(invoice.loyalty.discount)}</Text>
          )}
          <Text style={styles.total}>Total payé : {formatPrice(total)}</Text>
          {invoice.loyalty.pointsEarned > 0 && (
            <Text style={{ ...styles.muted, textAlign: "right" }}>
              + {invoice.loyalty.pointsEarned} points sur votre Carte Trinity
            </Text>
          )}

          <Section style={{ margin: "24px 0 8px", textAlign: "center" }}>
            <Button href={orderUrl} style={styles.button}>
              Suivre ma commande
            </Button>
          </Section>
          <Text style={{ ...styles.muted, textAlign: "center" }}>Votre facture est jointe à cet e-mail.</Text>
        </Container>
      </Body>
    </Html>
  );
}
