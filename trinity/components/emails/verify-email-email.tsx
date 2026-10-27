import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "@/components/emails/email-layout";

interface VerifyEmailEmailProps {
  firstName: string;
  verifyUrl: string;
  // Durée de validité du lien, en jours
  validityDays: number;
  siteUrl: string;
}

// Lien de confirmation de l'adresse, envoyé à la demande du client ou après un changement d'adresse
export function VerifyEmailEmail({ firstName, verifyUrl, validityDays, siteUrl }: VerifyEmailEmailProps) {
  return (
    <EmailLayout
      preview="Un clic pour confirmer votre adresse e-mail Trinity"
      siteUrl={siteUrl}
      reason="Vous recevez cet e-mail parce que cette adresse a été indiquée pour un compte Trinity."
      hero={{
        label: "Votre compte",
        title: `${firstName}, confirmez`,
        highlight: "votre adresse e-mail",
        subtitle: "Un clic suffit : c’est ce qui nous permet de vous écrire au bon endroit.",
      }}
    >
      <Text style={emailStyles.text}>
        Confirmez votre adresse pour recevoir le suivi de vos commandes, les rappels de panier et les alertes quand vos favoris
        passent en promotion.
      </Text>
      <Section style={{ textAlign: "center", margin: "22px 0 14px" }}>
        <Button href={verifyUrl} style={emailStyles.button}>
          Confirmer mon adresse
        </Button>
      </Section>
      <Text style={{ ...emailStyles.muted, textAlign: "center" }}>
        Ce lien est valable {validityDays} jours. Vous n’êtes pas à l’origine de cette demande ? Ignorez simplement cet e-mail.
      </Text>
    </EmailLayout>
  );
}
