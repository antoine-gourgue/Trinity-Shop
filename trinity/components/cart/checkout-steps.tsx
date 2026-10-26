import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Mon panier", "Retrait ou livraison", "Paiement", "Confirmation"];

// Étapes de la commande ; `current` commence à 0
export default function CheckoutSteps({ current }: { current: number }) {
  return (
    <ol className="-m-1.5 flex items-center gap-2 overflow-x-auto p-1.5 text-sm" aria-label="Étapes de la commande">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2">
            {index > 0 && <span aria-hidden className={cn("h-px w-6 sm:w-10", done || active ? "bg-primary" : "bg-border")} />}
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check size={14} aria-hidden /> : index + 1}
            </span>
            <span className={cn("font-bold", active ? "text-foreground" : "text-muted-foreground", !active && "hidden sm:inline")}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
