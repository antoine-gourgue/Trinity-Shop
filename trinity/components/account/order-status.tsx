import type { OrderStatus as Status } from "@prisma/client";
import { Ban, CircleCheck, Clock, PackageOpen, Store, Truck } from "lucide-react";
import { orderStatusLabel } from "@/lib/order-status";
import { cn } from "@/lib/utils";

const STYLES: Record<Status, string> = {
  received: "bg-secondary text-primary",
  preparing: "bg-highlight/30 text-brand-dark",
  ready: "bg-brand-dark text-white",
  completed: "bg-bio/10 text-bio",
  cancelled: "bg-promo/10 text-promo",
};

// Statut d'une commande dans l'espace client
export default function OrderStatus({
  status,
  delivery = false,
  className,
}: {
  status: Status;
  delivery?: boolean;
  className?: string;
}) {
  const Icon =
    status === "received"
      ? Clock
      : status === "preparing"
        ? PackageOpen
        : status === "ready"
          ? delivery
            ? Truck
            : Store
          : status === "completed"
            ? CircleCheck
            : Ban;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold", STYLES[status], className)}>
      <Icon size={14} aria-hidden />
      {orderStatusLabel(status, delivery)}
    </span>
  );
}
