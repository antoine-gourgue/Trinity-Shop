import type { PlaceOrderError } from "@/lib/orders/place-order";

export type PaymentFailure = PlaceOrderError["code"] | "unpaid" | "invalid";

// Messages affichés au client quand une commande ou un paiement n'aboutit pas
export function orderFailureMessage(code: PaymentFailure, products: string[] = []) {
  switch (code) {
    case "store_required":
      return "Choisissez votre magasin (en haut de la page) avant de commander.";
    case "slot_full":
      return "Ce créneau vient d'être complet : revenez à l'étape précédente pour en choisir un autre.";
    case "out_of_stock":
      return products.length
        ? `Stock insuffisant pour : ${products.join(", ")}. Modifiez ces articles dans votre panier.`
        : "Un article n'est plus disponible en quantité suffisante. Modifiez votre panier.";
    case "not_enough_points":
      return "Votre solde Carte Trinity ne couvre plus ces bons de réduction.";
    case "invalid_delivery_address":
      return "L'adresse de livraison n'est plus valable : choisissez-en une autre.";
    case "cart_empty":
    case "cart_not_found":
    case "cart_forbidden":
      return "Votre panier a changé : vérifiez-le avant de payer.";
    case "unpaid":
      return "Le paiement n'a pas été finalisé. Aucun montant n'a été débité.";
    case "invalid":
      return "Le paiement n'a pas pu être associé à votre commande.";
  }
}
