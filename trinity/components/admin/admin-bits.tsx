import ProductImage from "@/components/product/product-image";
import { formatPickupDate } from "@/lib/checkout";
import { orderNumber } from "@/lib/account";
import { cn } from "@/lib/utils";
import { Badge } from "./admin-ui";

export function ProductThumb({ src, alt, size = "md" }: { src: string; alt: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-xl border bg-white",
        size === "sm" ? "h-10 w-10" : size === "md" ? "h-12 w-12" : "h-24 w-24"
      )}
    >
      <ProductImage src={src} alt={alt} sizes="96px" className="p-1" />
    </span>
  );
}

export function customerName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function OrderNumber({ id }: { id: string }) {
  return <span className="font-mono text-sm font-bold">#{orderNumber(id)}</span>;
}

// Statut d'une commande d'après son créneau de retrait au drive
export function PickupBadge({ pickupSlot, validated }: { pickupSlot: Date | null; validated: boolean }) {
  if (!validated) return <Badge tone="warning">En attente de paiement</Badge>;
  if (!pickupSlot) return <Badge tone="muted">Sans créneau</Badge>;
  return pickupSlot.getTime() >= Date.now() ? (
    <Badge tone="brand">Retrait à venir</Badge>
  ) : (
    <Badge tone="success">Retirée</Badge>
  );
}

export function pickupLabel(pickupSlot: Date | null) {
  return pickupSlot ? formatPickupDate(pickupSlot) : "—";
}

export function StockBadge({ quantity, low }: { quantity: number; low: number }) {
  if (quantity === 0) return <Badge tone="danger">Rupture</Badge>;
  if (quantity < low) return <Badge tone="warning">{quantity} · faible</Badge>;
  return <Badge tone="success">{quantity}</Badge>;
}
