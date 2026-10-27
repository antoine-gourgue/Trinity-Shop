import { Button, Link, Section, Text } from "@react-email/components";
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
  | { status: "preparing" | "ready" }
  // Points Carte Trinity gagnés avec cette commande
  | { status: "completed"; pointsEarned: number }
  // Montant remboursé en millièmes d'euro, null si rien n'avait été débité ; bons Carte Trinity rendus
  | { status: "cancelled"; refundedAmount: number | null; vouchersReturned: boolean }
);

function hero(props: OrderStatusEmailProps): EmailHero {
  const label = `Commande n° ${props.orderNumber}`;
  const slot = props.pickupLabel ? `, ${props.pickupLabel.toLowerCase()}` : "";
  switch (props.status) {
    case "cancelled":
      return {
        label,
        title: "Votre commande a été",
        highlight: "annulée",
        subtitle: "Nous sommes désolés : elle n’a pas pu être préparée. Voici ce qui se passe maintenant.",
      };
    case "completed":
      return {
        label,
        title: props.deliveryAddress ? "Vos courses sont" : "Merci pour votre",
        highlight: props.deliveryAddress ? "bien livrées !" : "visite au drive !",
        subtitle: "Votre commande est terminée. Bonne dégustation, et à très vite sur Trinity !",
      };
    case "preparing":
      return {
        label,
        title: "Vos courses sont",
        highlight: "en préparation",
        subtitle: `Nous remplissons votre panier rayon par rayon pour votre créneau${slot}.`,
      };
    case "ready":
      return props.deliveryAddress
        ? { label, title: "Vos courses sont", highlight: "en route !", subtitle: `Notre livreur arrive sur votre créneau${slot}.` }
        : { label, title: "Vos courses sont", highlight: "prêtes au drive !", subtitle: `Elles vous attendent au drive Trinity U Rennes Epitech${slot}.` };
  }
}

function previewStatus(props: OrderStatusEmailProps) {
  switch (props.status) {
    case "cancelled":
      return "annulée";
    case "completed":
      return props.deliveryAddress ? "livrée" : "retirée au drive";
    case "preparing":
      return "en préparation";
    case "ready":
      return props.deliveryAddress ? "en route" : "prête au drive";
  }
}

// Ce qui attend le client après ce changement de statut
function nextStep(props: OrderStatusEmailProps & { status: "preparing" | "ready" }) {
  if (props.status === "preparing") {
    return props.deliveryAddress
      ? "Nous vous écrirons dès que vos courses partiront en livraison."
      : "Nous vous écrirons dès que vos courses vous attendront au drive.";
  }
  return props.deliveryAddress
    ? "Pensez à être présent pour réceptionner vos courses : les produits frais voyagent au froid."
    : `Donnez le numéro de commande ${props.orderNumber} à l’accueil du drive : nous chargeons vos courses dans votre coffre.`;
}

// Retrait ou livraison : créneau, lieu et nombre d'articles
function PickupBox(props: OrderStatusEmailProps) {
  const done = props.status === "completed";
  const mode = props.deliveryAddress ? (done ? "Livrée à domicile" : "Livraison à domicile") : done ? "Retirée au drive" : "Retrait au drive";

  return (
    <Section style={{ ...emailStyles.box, marginTop: 0 }}>
      <Text style={emailStyles.strong}>{mode}</Text>
      {props.pickupLabel && <Text style={{ ...emailStyles.muted, margin: 0 }}>{props.pickupLabel}</Text>}
      <Text style={{ ...emailStyles.muted, margin: 0 }}>
        {props.deliveryAddress ?? "Trinity U Rennes Epitech"} · {props.articleCount} article{props.articleCount > 1 ? "s" : ""}
      </Text>
    </Section>
  );
}

function Body(props: OrderStatusEmailProps) {
  switch (props.status) {
    case "preparing":
    case "ready":
      return (
        <>
          <PickupBox {...props} />
          <Text style={emailStyles.text}>{nextStep(props)}</Text>
        </>
      );
    case "completed":
      return (
        <>
          <PickupBox {...props} />
          {props.pointsEarned > 0 && (
            <Text style={emailStyles.text}>
              Cette commande vous a rapporté <strong>{props.pointsEarned} points</strong> sur votre Carte Trinity.
            </Text>
          )}
          <Text style={emailStyles.text}>
            Votre facture reste disponible dans{" "}
            <Link href={props.orderUrl} style={emailStyles.link}>
              le détail de votre commande
            </Link>
            .
          </Text>
        </>
      );
    case "cancelled":
      return (
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
      );
  }
}

// Changement de statut d'une commande : en préparation, prête (retrait ou livraison), terminée ou annulée
export function OrderStatusEmail(props: OrderStatusEmailProps) {
  // Commande en cours : lien vers son suivi ; commande terminée ou annulée : retour aux courses
  const finished = props.status === "completed" || props.status === "cancelled";

  return (
    <EmailLayout
      preview={`Commande n° ${props.orderNumber} : ${previewStatus(props)}`}
      siteUrl={props.siteUrl}
      hero={hero(props)}
      reason="Vous recevez cet e-mail pour suivre une commande passée sur Trinity."
    >
      <Body {...props} />

      <Section style={{ textAlign: "center", margin: "22px 0 10px" }}>
        <Button href={finished ? props.siteUrl : props.orderUrl} style={emailStyles.button}>
          {finished ? "Refaire mes courses" : "Voir ma commande"}
        </Button>
      </Section>
      {props.status === "cancelled" && (
        <Text style={{ ...emailStyles.muted, textAlign: "center" }}>Une question ? Contactez-nous depuis la page « Nous contacter » du site.</Text>
      )}
    </EmailLayout>
  );
}
