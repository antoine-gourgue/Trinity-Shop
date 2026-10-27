import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, emailStyles, type EmailHero } from "@/components/emails/email-layout";
import { formatPrice } from "@/lib/format";

export type OrderStatusEmailProps = {
  firstName: string;
  orderNumber: string;
  pickupLabel: string | null;
  // Adresse de livraison, absente pour un retrait au drive
  deliveryAddress: string | null;
  articleCount: number;
  orderUrl: string;
  siteUrl: string;
} & (
  | { status: "ready" }
  // Montant remboursé en millièmes d'euro, null si rien n'avait été débité ; bons Carte Trinity rendus
  | { status: "cancelled"; refundedAmount: number | null; vouchersReturned: boolean }
);

function hero(props: OrderStatusEmailProps): EmailHero {
  const label = `Commande n° ${props.orderNumber}`;
  if (props.status === "cancelled") {
    return {
      label,
      title: "Votre commande a été",
      highlight: "annulée",
      subtitle: "Nous sommes désolés : elle n’a pas pu être préparée. Voici ce qui se passe maintenant.",
    };
  }
  return props.deliveryAddress
    ? {
        label,
        title: "Vos courses sont",
        highlight: "en route !",
        subtitle: `Notre livreur arrive sur votre créneau${props.pickupLabel ? `, ${props.pickupLabel.toLowerCase()}` : ""}.`,
      }
    : {
        label,
        title: "Vos courses sont",
        highlight: "prêtes au drive !",
        subtitle: `Elles vous attendent au drive Trinity U Rennes Epitech${props.pickupLabel ? `, ${props.pickupLabel.toLowerCase()}` : ""}.`,
      };
}

// Changement de statut d'une commande : prête (retrait ou livraison) ou annulée
export function OrderStatusEmail(props: OrderStatusEmailProps) {
  const articles = `${props.articleCount} article${props.articleCount > 1 ? "s" : ""}`;

  return (
    <EmailLayout
      preview={`Commande n° ${props.orderNumber} : ${props.status === "cancelled" ? "annulée" : props.deliveryAddress ? "en route" : "prête au drive"}`}
      siteUrl={props.siteUrl}
      hero={hero(props)}
      reason="Vous recevez cet e-mail pour suivre une commande passée sur Trinity."
    >
      {props.status === "ready" ? (
        <>
          <Section style={{ ...emailStyles.box, marginTop: 0 }}>
            <Text style={emailStyles.strong}>{props.deliveryAddress ? "Livraison à domicile" : "Retrait au drive"}</Text>
            {props.pickupLabel && <Text style={{ ...emailStyles.muted, margin: 0 }}>{props.pickupLabel}</Text>}
            <Text style={{ ...emailStyles.muted, margin: 0 }}>
              {props.deliveryAddress ?? "Trinity U Rennes Epitech"} · {articles}
            </Text>
          </Section>
          <Text style={emailStyles.text}>
            {props.deliveryAddress
              ? "Pensez à être présent pour réceptionner vos courses : les produits frais voyagent au froid."
              : `Donnez le numéro de commande ${props.orderNumber} à l’accueil du drive : nous chargeons vos courses dans votre coffre.`}
          </Text>
        </>
      ) : (
        <>
          <Section style={{ ...emailStyles.box, marginTop: 0 }}>
            <Text style={emailStyles.strong}>
              {props.refundedAmount ? `Remboursement de ${formatPrice(props.refundedAmount)}` : "Aucun débit"}
            </Text>
            <Text style={{ ...emailStyles.muted, margin: 0 }}>
              {props.refundedAmount
                ? "Le montant revient sur la carte utilisée pour payer, sous 5 à 10 jours ouvrés selon votre banque."
                : "Aucun montant ne vous a été débité pour cette commande."}
            </Text>
          </Section>
          {props.vouchersReturned && (
            <Text style={emailStyles.text}>Les bons Carte Trinity utilisés pour cette commande vous ont été rendus.</Text>
          )}
        </>
      )}

      <Section style={{ textAlign: "center", margin: "22px 0 10px" }}>
        <Button href={props.status === "cancelled" ? props.siteUrl : props.orderUrl} style={emailStyles.button}>
          {props.status === "cancelled" ? "Refaire mes courses" : "Voir ma commande"}
        </Button>
      </Section>
      {props.status === "cancelled" && (
        <Text style={{ ...emailStyles.muted, textAlign: "center" }}>Une question ? Contactez-nous depuis la page « Nous contacter » du site.</Text>
      )}
    </EmailLayout>
  );
}
