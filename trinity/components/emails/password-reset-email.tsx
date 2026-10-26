import { Button, Link, Section, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "@/components/emails/email-layout";

interface PasswordResetEmailProps {
  firstName: string;
  resetUrl: string;
  siteUrl: string;
}

// « Mot de passe oublié » : lien vers /auth/reinitialiser, valable 1 heure et utilisable une fois
export function PasswordResetEmail({ firstName, resetUrl, siteUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview="Choisissez un nouveau mot de passe Trinity"
      siteUrl={siteUrl}
      reason="Vous recevez cet e-mail parce qu'une réinitialisation du mot de passe a été demandée pour votre compte."
      hero={{
        label: "Mot de passe oublié",
        title: "Choisissez un",
        highlight: "nouveau mot de passe",
        subtitle: `Bonjour ${firstName}, vous avez demandé à changer le mot de passe de votre compte Trinity.`,
      }}
    >
      <Text style={emailStyles.text}>Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</Text>

      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button href={resetUrl} style={emailStyles.button}>
          Choisir un nouveau mot de passe
        </Button>
      </Section>

      <Section style={emailStyles.box}>
        <Text style={{ ...emailStyles.muted, margin: 0 }}>
          Ce lien est valable <strong>1 heure</strong> et ne sert qu’une fois. Vous n’êtes pas à l’origine de cette demande ?
          Ignorez cet e-mail : votre mot de passe reste inchangé.
        </Text>
      </Section>

      <Text style={emailStyles.muted}>Le bouton ne fonctionne pas ? Copiez cette adresse dans votre navigateur :</Text>
      <Text style={{ ...emailStyles.muted, wordBreak: "break-all" }}>
        <Link href={resetUrl} style={emailStyles.link}>
          {resetUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}
