import { formatPickupDate } from "@/lib/checkout";
import { orderNumber } from "@/lib/account";
import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_TONES, orderStatusLabel } from "@/lib/order-status";
import { Badge } from "./admin-ui";

export { ProductThumb } from "./product-thumb";

export function customerName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function OrderNumber({ id }: { id: string }) {
  return <span className="font-mono text-sm font-bold">#{orderNumber(id)}</span>;
}

// Statut de préparation d'une commande
export function OrderStatusBadge({ status, delivery = false }: { status: OrderStatus; delivery?: boolean }) {
  return <Badge tone={ORDER_STATUS_TONES[status]}>{orderStatusLabel(status, delivery)}</Badge>;
}

export function pickupLabel(pickupSlot: Date | null) {
  return pickupSlot ? formatPickupDate(pickupSlot) : "—";
}

export function StockBadge({ quantity, low }: { quantity: number; low: number }) {
  if (quantity === 0) return <Badge tone="danger">Rupture</Badge>;
  if (quantity < low) return <Badge tone="warning">{quantity} · faible</Badge>;
  return <Badge tone="success">{quantity}</Badge>;
}
