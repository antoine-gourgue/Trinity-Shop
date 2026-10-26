import { Body, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";
import type * as React from "react";

// Couleurs du site (globals.css), en hexadécimal : les messageries ne lisent pas les variables CSS
export const EMAIL_COLORS = {
  brand: "#007C8F",
  dark: "#005461",
  highlight: "#FFD000",
  promo: "#E50615",
  text: "#1F2933",
  muted: "#5F6B76",
  soft: "#E9F3F5",
  page: "#F3F6F7",
  border: "#DCE5E8",
};

// Police du site (Mulish), avec des polices système quand la messagerie ne charge pas les polices web
const FONT = "Mulish, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// Styles partagés par les e-mails (écrits en ligne : c'est ce que les messageries affichent le mieux)
export const emailStyles = {
  text: { color: EMAIL_COLORS.text, fontFamily: FONT, fontSize: 15, lineHeight: "23px", margin: "0 0 14px" },
  muted: { color: EMAIL_COLORS.muted, fontFamily: FONT, fontSize: 13, lineHeight: "20px", margin: "0 0 8px" },
  strong: { color: EMAIL_COLORS.text, fontFamily: FONT, fontSize: 15, fontWeight: 800, lineHeight: "22px", margin: "0 0 4px" },
  box: { backgroundColor: EMAIL_COLORS.soft, borderRadius: 16, padding: "14px 18px", margin: "18px 0" },
  button: {
    backgroundColor: EMAIL_COLORS.brand,
    borderRadius: 999,
    color: "#ffffff",
    display: "inline-block",
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: 800,
    padding: "14px 30px",
    textDecoration: "none",
  },
  link: { color: EMAIL_COLORS.brand, fontWeight: 800, textDecoration: "underline" },
} satisfies Record<string, React.CSSProperties>;

// Bloc titre façon page d'accueil : étiquette jaune, titre blanc dont la fin est surlignée en jaune
export interface EmailHero {
  label: string;
  title: string;
  highlight: string;
  subtitle: string;
}

interface EmailLayoutProps {
  preview: string;
  siteUrl: string;
  hero: EmailHero;
  // Raison de l'envoi, rappelée en pied de page
  reason: string;
  children: React.ReactNode;
}

// Gabarit commun, au design du site : bandeau, en-tête avec le logo, bloc titre, carte de contenu, pied de page
export function EmailLayout({ preview, siteUrl, hero, reason, children }: EmailLayoutProps) {
  const host = new URL(siteUrl).host;

  return (
    <Html lang="fr">
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: EMAIL_COLORS.page, fontFamily: FONT, margin: 0, padding: "0 0 28px" }}>
        {/* Bandeau du site */}
        <Section style={{ backgroundColor: EMAIL_COLORS.dark }}>
          <Container style={{ maxWidth: 600, padding: "9px 20px" }}>
            <Text style={{ color: "#ffffff", fontFamily: FONT, fontSize: 12, fontWeight: 700, lineHeight: "16px", margin: 0 }}>
              Trinity U Rennes Epitech
              <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 400 }}> · Drive et livraison à domicile</span>
            </Text>
          </Container>
        </Section>

        {/* En-tête avec le logo, comme sur le site */}
        <Section style={{ backgroundColor: "#ffffff", borderBottom: `1px solid ${EMAIL_COLORS.border}` }}>
          <Container style={{ maxWidth: 600, padding: "14px 20px" }}>
            <Link href={siteUrl} style={{ textDecoration: "none" }}>
              <Row>
                <Column style={{ width: 52 }}>
                  <div
                    style={{
                      backgroundColor: EMAIL_COLORS.soft,
                      borderRadius: 12,
                      height: 40,
                      lineHeight: "40px",
                      textAlign: "center",
                      width: 40,
                    }}
                  >
                    <Img
                      src={`${siteUrl}/assets/trinity-logo.png`}
                      alt="Trinity"
                      width={28}
                      height={24}
                      style={{ display: "inline-block", verticalAlign: "middle" }}
                    />
                  </div>
                </Column>
                <Column>
                  <Text style={{ color: EMAIL_COLORS.dark, fontFamily: FONT, fontSize: 20, fontWeight: 900, letterSpacing: -0.3, lineHeight: "22px", margin: 0 }}>
                    TRINITY
                  </Text>
                  <Text style={{ color: EMAIL_COLORS.brand, fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 2, lineHeight: "15px", margin: 0 }}>
                    COURSES EN LIGNE
                  </Text>
                </Column>
              </Row>
            </Link>
          </Container>
        </Section>

        <Container style={{ maxWidth: 600, padding: "20px 16px 0" }}>
          {/* Bloc titre, comme le bandeau d'accueil du site */}
          <Section style={{ backgroundColor: EMAIL_COLORS.dark, borderRadius: 24, padding: "26px 28px" }}>
            <Text style={{ margin: "0 0 14px" }}>
              <span
                style={{
                  backgroundColor: EMAIL_COLORS.highlight,
                  borderRadius: 8,
                  color: EMAIL_COLORS.dark,
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 900,
                  padding: "5px 12px",
                }}
              >
                {hero.label}
              </span>
            </Text>
            <Heading style={{ color: "#ffffff", fontFamily: FONT, fontSize: 28, fontWeight: 900, lineHeight: "34px", margin: "0 0 10px" }}>
              {hero.title} <span style={{ color: EMAIL_COLORS.highlight }}>{hero.highlight}</span>
            </Heading>
            <Text style={{ color: "rgba(255,255,255,0.78)", fontFamily: FONT, fontSize: 15, lineHeight: "22px", margin: 0 }}>
              {hero.subtitle}
            </Text>
          </Section>

          {/* Contenu, dans une carte comme les encadrés du site */}
          <Section
            style={{
              backgroundColor: "#ffffff",
              border: `1px solid ${EMAIL_COLORS.border}`,
              borderRadius: 24,
              marginTop: 14,
              padding: "24px 26px 14px",
            }}
          >
            {children}
          </Section>

          <Section style={{ padding: "20px 12px 0", textAlign: "center" }}>
            <Text style={{ ...emailStyles.muted, fontSize: 12 }}>
              <Link href={siteUrl} style={{ color: EMAIL_COLORS.brand, fontWeight: 700 }}>
                {host}
              </Link>
              {" · "}
              <Link href={`${siteUrl}/legal/faq`} style={{ color: EMAIL_COLORS.brand }}>
                Aide et FAQ
              </Link>
              {" · "}
              <Link href={`${siteUrl}/legal/contact`} style={{ color: EMAIL_COLORS.brand }}>
                Nous contacter
              </Link>
            </Text>
            <Hr style={{ borderColor: EMAIL_COLORS.border, margin: "10px 0" }} />
            <Text style={{ ...emailStyles.muted, fontSize: 11 }}>{reason}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
