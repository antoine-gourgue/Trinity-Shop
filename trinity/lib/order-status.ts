import type { OrderStatus } from "@prisma/client";

// Étapes d'une commande, de la réception à la remise au client
export const ORDER_STEPS: OrderStatus[] = ["received", "preparing", "ready", "completed"];

export function orderStatusLabel(status: OrderStatus, delivery: boolean) {
  switch (status) {
    case "received":
      return "Reçue";
    case "preparing":
      return "En préparation";
    case "ready":
      return delivery ? "En livraison" : "Prête au retrait";
    case "completed":
      return delivery ? "Livrée" : "Retirée";
    case "cancelled":
      return "Annulée";
  }
}

export const ORDER_STATUS_TONES = {
  received: "brand",
  preparing: "warning",
  ready: "dark",
  completed: "success",
  cancelled: "danger",
} as const satisfies Record<OrderStatus, string>;

// Étape suivante de la préparation, ou null si la commande est terminée ou annulée
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STEPS.indexOf(status);
  return index >= 0 && index < ORDER_STEPS.length - 1 ? ORDER_STEPS[index + 1] : null;
}

export function canCancelOrder(status: OrderStatus) {
  return status !== "completed" && status !== "cancelled";
}
