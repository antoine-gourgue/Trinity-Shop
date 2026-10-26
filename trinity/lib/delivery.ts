// Retrait au drive ou livraison à domicile. Une commande livrée est celle qui porte une adresse
// de livraison ; ses frais suivent une règle fixe calculée sur le montant des articles.

export type Fulfillment = "pickup" | "delivery";

export const DELIVERY_FEE = 5900; // 5,90 €, en millièmes d'euro comme les prix
export const FREE_DELIVERY_FROM = 60000; // livraison offerte dès 60 € d'articles

export function deliveryFee(itemsTotal: number) {
  return itemsTotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
}

export function orderFulfillment(order: { shippingAddressId: string | null }): Fulfillment {
  return order.shippingAddressId ? "delivery" : "pickup";
}

// Frais d'une commande enregistrée (0 pour un retrait au drive)
export function orderDeliveryFee(order: { shippingAddressId: string | null }, itemsTotal: number) {
  return order.shippingAddressId ? deliveryFee(itemsTotal) : 0;
}

export function formatAddressLine(address: { street: string; zipCode: string; city: string }) {
  return `${address.street}, ${address.zipCode} ${address.city}`;
}

export const FULFILLMENT_LABELS: Record<Fulfillment, string> = {
  pickup: "Retrait au drive",
  delivery: "Livraison à domicile",
};
