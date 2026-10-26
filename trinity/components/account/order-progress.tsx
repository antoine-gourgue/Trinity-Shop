import type { OrderStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { ORDER_STEPS, orderStatusLabel } from "@/lib/order-status";
import { cn } from "@/lib/utils";

// Frise d'avancement d'une commande : reçue, en préparation, prête, remise au client
export default function OrderProgress({ status, delivery }: { status: OrderStatus; delivery: boolean }) {
  if (status === "cancelled") {
    return (
      <p className="rounded-2xl border border-promo/30 bg-promo/5 px-4 py-3 text-sm font-semibold text-promo">
        Cette commande a été annulée. Les articles ne vous seront pas facturés.
      </p>
    );
  }

  const current = ORDER_STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Avancement de la commande">
      {ORDER_STEPS.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step} aria-current={index === current ? "step" : undefined} className="flex flex-col items-center gap-2 text-center">
            <span className="flex w-full items-center">
              <span className={cn("h-1 flex-1 rounded-full", index === 0 ? "invisible" : done ? "bg-primary" : "bg-muted")} />
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black",
                  done ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-white text-muted-foreground"
                )}
              >
                {done ? <Check size={14} aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  "h-1 flex-1 rounded-full",
                  index === ORDER_STEPS.length - 1 ? "invisible" : index < current ? "bg-primary" : "bg-muted"
                )}
              />
            </span>
            <span className={cn("text-xs font-bold", done ? "text-foreground" : "text-muted-foreground")}>
              {orderStatusLabel(step, delivery)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
