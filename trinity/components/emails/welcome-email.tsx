import { Button, Column, Link, Row, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EmailLayout, emailStyles } from "@/components/emails/email-layout";
import { DELIVERY_FEE, FREE_DELIVERY_FROM } from "@/lib/delivery";
import { POINTS_PER_VOUCHER, VOUCHER_VALUE } from "@/lib/loyalty";
import { formatPrice } from "@/lib/format";

interface WelcomeEmailProps {
  firstName: string;
  siteUrl: string;
}

const card = {
  border: `1px solid ${EMAIL_COLORS.border}`,
  borderRadius: 16,
  padding: "14px 16px",
  verticalAlign: "top",
  width: "50%",
};

// Envoyé à l'inscription : ce que le client peut faire, et par où commencer
export function WelcomeEmail({ firstName, siteUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout
      preview={`Bienvenue chez Trinity, ${firstName} : vos courses en ligne vous attendent`}
      siteUrl={siteUrl}
      reason="Vous recevez cet e-mail parce qu'un compte Trinity vient d'être créé avec cette adresse."
      hero={{
        label: "Bienvenue",
        title: `${firstName}, vos courses du quotidien,`,
        highlight: "prêtes au drive",
        subtitle: "Votre compte est prêt : plus de 1 200 produits à commander en ligne, préparés par nos équipes.",
      }}
    >
      <Text style={emailStyles.text}>Remplissez votre panier, choisissez un créneau d’une heure, et récupérez vos courses :</Text>

      <Row style={{ margin: "18px 0" }}>
        <Column style={card}>
          <Text style={emailStyles.strong}>Retrait au drive</Text>
          <Text style={{ ...emailStyles.muted, margin: 0 }}>Gratuit, sur le créneau de votre choix.</Text>
        </Column>
        {/* Colonne vide : espace entre les deux encadrés (les messageries ignorent souvent les marges) */}
        <Column style={{ width: 12, minWidth: 12 }}>{"\u00a0"}</Column>
        <Column style={card}>
          <Text style={emailStyles.strong}>Livraison à domicile</Text>
          <Text style={{ ...emailStyles.muted, margin: 0 }}>
            {formatPrice(DELIVERY_FEE)}, offerte dès {formatPrice(FREE_DELIVERY_FROM)} d’achats.
          </Text>
        </Column>
      </Row>

      <Section style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <Button href={siteUrl} style={emailStyles.button}>
          Commencer mes courses
        </Button>
      </Section>

      <Section style={emailStyles.box}>
        <Text style={emailStyles.strong}>Votre Carte Trinity, gratuite</Text>
        <Text style={{ ...emailStyles.muted, margin: 0 }}>
          1 point par euro dépensé, et {formatPrice(VOUCHER_VALUE)} de réduction tous les {POINTS_PER_VOUCHER} points.{" "}
          <Link href={`${siteUrl}/user/fidelite`} style={emailStyles.link}>
            Activer ma carte
          </Link>
        </Text>
      </Section>

      <Text style={emailStyles.muted}>
        Votre adresse e-mail est votre identifiant. Mot de passe oublié ? Vous pourrez en choisir un nouveau depuis la page
        de connexion.
      </Text>
    </EmailLayout>
  );
}
