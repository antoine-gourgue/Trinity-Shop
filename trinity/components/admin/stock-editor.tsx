"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Minus, Plus } from "lucide-react";
import { updateStockQuantity } from "@/lib/server-actions/admin-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Ajustement rapide d'un stock depuis la liste : boutons −/+ ou saisie, puis validation
export default function StockEditor({ stockId, quantity, productName }: { stockId: string; quantity: number; productName: string }) {
  const router = useRouter();
  const [value, setValue] = useState(String(quantity));
  const [isPending, startTransition] = useTransition();
  const parsed = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0;
  const changed = valid && parsed !== quantity;

  const save = () => {
    if (!changed) return;
    startTransition(async () => {
      const result = await updateStockQuantity(stockId, parsed);
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      toast({ description: `Stock de « ${productName} » mis à jour : ${parsed}.` });
      router.refresh();
    });
  };

  const step = (delta: number) => setValue(String(Math.max(0, (valid ? parsed : quantity) + delta)));
  const button = "flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-primary disabled:opacity-40";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex items-center justify-end gap-2"
    >
      <div className={cn("flex items-center rounded-full border bg-white", !valid && "border-promo")}>
        <button type="button" onClick={() => step(-1)} disabled={isPending || parsed <= 0} aria-label="Retirer une unité" className={button}>
          <Minus size={14} aria-hidden />
        </button>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          aria-label={`Stock de ${productName}`}
          className="h-9 w-14 bg-transparent text-center text-sm font-bold tabular-nums outline-none"
        />
        <button type="button" onClick={() => step(1)} disabled={isPending} aria-label="Ajouter une unité" className={button}>
          <Plus size={14} aria-hidden />
        </button>
      </div>
      <button
        type="submit"
        disabled={!changed || isPending}
        aria-label="Enregistrer le stock"
        title="Enregistrer"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          changed ? "bg-primary text-primary-foreground hover:bg-brand-dark" : "border bg-white text-muted-foreground/40"
        )}
      >
        {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
      </button>
    </form>
  );
}
