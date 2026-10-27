import { Button, Column, Hr, Img, Row, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EmailLayout, emailStyles } from "@/components/emails/email-layout";
import { formatPrice } from "@/lib/format";

export interface CartReminderItem {
  name: string;
  quantity: number;
  price: number;
  // Photo en URL absolue (copie locale du site ou Open Food Facts), ou null sans photo
  picture: string | null;
}

interface CartReminderEmailProps {
  firstName: string;
  items: CartReminderItem[];
  siteUrl: string;
  unsubscribeUrl: string;
}

// Articles montrés dans l'e-mail ; les autres sont résumés en une ligne
const SHOWN = 4;

// Rappel envoyé quelques heures après qu'un client a laissé des articles dans son panier sans commander
export function CartReminderEmail({ firstName, items, siteUrl, unsubscribeUrl }: CartReminderEmailProps) {
  const count = items.reduce((acc, item) => acc + item.quantity, 0);
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const hidden = items.length - SHOWN;

  return (
    <EmailLayout
      preview={`${count} article${count > 1 ? "s" : ""} vous attendent dans votre panier Trinity`}
      siteUrl={siteUrl}
      hero={{
        label: "Votre panier",
        title: `${firstName}, vous avez oublié`,
        highlight: "quelque chose ?",
        subtitle: `${count} article${count > 1 ? "s vous attendent" : " vous attend"} dans votre panier. Il ne reste qu’à choisir un créneau.`,
      }}
      reason="Vous recevez ce rappel parce que des articles sont restés dans votre panier Trinity."
      unsubscribe={{ url: unsubscribeUrl, label: "Ne plus recevoir ces rappels" }}
    >
      {items.slice(0, SHOWN).map((item) => (
        <Row key={item.name} style={{ marginBottom: 10 }}>
          <Column style={{ width: 64 }}>
            {item.picture ? (
              <Img
                src={item.picture}
                alt=""
                width={52}
                height={52}
                style={{ border: `1px solid ${EMAIL_COLORS.border}`, borderRadius: 12, objectFit: "contain", backgroundColor: "#ffffff" }}
              />
            ) : (
              <div style={{ backgroundColor: EMAIL_COLORS.soft, borderRadius: 12, height: 52, width: 52 }} />
            )}
          </Column>
          <Column>
            <Text style={{ ...emailStyles.text, margin: 0 }}>{item.name}</Text>
            <Text style={{ ...emailStyles.muted, margin: 0 }}>Quantité : {item.quantity}</Text>
          </Column>
          <Column style={{ width: 80 }}>
            <Text style={{ ...emailStyles.text, fontWeight: 800, margin: 0, textAlign: "right" }}>{formatPrice(item.price * item.quantity)}</Text>
          </Column>
        </Row>
      ))}
      {hidden > 0 && (
        <Text style={emailStyles.muted}>
          et {hidden} autre{hidden > 1 ? "s" : ""} produit{hidden > 1 ? "s" : ""}
        </Text>
      )}

      <Hr style={{ borderColor: EMAIL_COLORS.border, margin: "12px 0" }} />
      <Row>
        <Column>
          <Text style={{ ...emailStyles.text, fontWeight: 900, margin: 0 }}>Total du panier</Text>
        </Column>
        <Column style={{ width: 110 }}>
          <Text style={{ ...emailStyles.text, fontWeight: 900, margin: 0, textAlign: "right" }}>{formatPrice(total)}</Text>
        </Column>
      </Row>

      <Section style={{ textAlign: "center", margin: "24px 0 10px" }}>
        <Button href={`${siteUrl}/cart`} style={emailStyles.button}>
          Reprendre mon panier
        </Button>
      </Section>
      <Text style={{ ...emailStyles.muted, textAlign: "center" }}>
        Retrait gratuit au drive ou livraison à domicile. Les prix et les stocks peuvent évoluer d’ici votre commande.
      </Text>
    </EmailLayout>
  );
}
