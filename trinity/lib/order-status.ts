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

// Étape suivante de chaque statut (dans l'ordre de ORDER_STEPS), null une fois la commande terminée ou annulée
const NEXT_STEP = {
  received: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
  cancelled: null,
} as const satisfies Record<OrderStatus, OrderStatus | null>;

// Statut que l'on atteint en faisant avancer une commande
export type AdvancedOrderStatus = NonNullable<(typeof NEXT_STEP)[OrderStatus]>;

// Étape suivante de la préparation, ou null si la commande est terminée ou annulée
export function nextOrderStatus(status: OrderStatus): AdvancedOrderStatus | null {
  return NEXT_STEP[status];
}

export function canCancelOrder(status: OrderStatus) {
  return status !== "completed" && status !== "cancelled";
}
