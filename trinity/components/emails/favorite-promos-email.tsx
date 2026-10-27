import { Button, Column, Img, Row, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EmailLayout, emailStyles } from "@/components/emails/email-layout";
import { formatPrice } from "@/lib/format";

export interface FavoritePromoItem {
  name: string;
  price: number;
  regularPrice: number;
  // Photo en URL absolue (copie locale du site ou Open Food Facts), ou null sans photo
  picture: string | null;
  // « dimanche 2 novembre », ou null pour une promotion sans date de fin
  endsOn: string | null;
}

interface FavoritePromosEmailProps {
  firstName: string;
  items: FavoritePromoItem[];
  siteUrl: string;
  unsubscribeUrl: string;
}

// Produits montrés dans l'e-mail ; les autres sont résumés en une ligne
const SHOWN = 4;

// Alerte envoyée quand des produits mis en favoris passent en promotion
export function FavoritePromosEmail({ firstName, items, siteUrl, unsubscribeUrl }: FavoritePromosEmailProps) {
  const count = items.length;
  const hidden = count - SHOWN;

  return (
    <EmailLayout
      preview={`${count} de vos favoris ${count > 1 ? "sont" : "est"} en promotion chez Trinity`}
      siteUrl={siteUrl}
      hero={{
        label: "Vos favoris",
        title: `${firstName}, ${count > 1 ? "vos favoris sont" : "un de vos favoris est"}`,
        highlight: "en promo !",
        subtitle: `${count > 1 ? `${count} produits que vous aimez coûtent` : "Un produit que vous aimez coûte"} moins cher en ce moment. Profitez-en avant la fin de l’offre.`,
      }}
      reason="Vous recevez cette alerte parce que ces produits sont dans vos favoris Trinity."
      unsubscribe={{ url: unsubscribeUrl, label: "Ne plus recevoir ces alertes" }}
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
            {item.endsOn && <Text style={{ ...emailStyles.muted, margin: 0 }}>Jusqu’au {item.endsOn}</Text>}
          </Column>
          <Column style={{ width: 90 }}>
            <Text style={{ ...emailStyles.text, color: EMAIL_COLORS.promo, fontWeight: 900, margin: 0, textAlign: "right" }}>
              {formatPrice(item.price)}
            </Text>
            <Text style={{ ...emailStyles.muted, margin: 0, textAlign: "right", textDecoration: "line-through" }}>
              {formatPrice(item.regularPrice)}
            </Text>
          </Column>
        </Row>
      ))}
      {hidden > 0 && (
        <Text style={emailStyles.muted}>
          et {hidden} autre{hidden > 1 ? "s" : ""} favori{hidden > 1 ? "s" : ""} en promotion
        </Text>
      )}

      <Section style={{ textAlign: "center", margin: "24px 0 10px" }}>
        <Button href={`${siteUrl}/user/favoris`} style={emailStyles.button}>
          Voir mes favoris
        </Button>
      </Section>
      <Text style={{ ...emailStyles.muted, textAlign: "center" }}>
        Prix valables dans la limite des stocks disponibles, au moment de votre commande.
      </Text>
    </EmailLayout>
  );
}
