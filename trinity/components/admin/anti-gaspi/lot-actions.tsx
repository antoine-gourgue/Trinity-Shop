"use client";

import { HandHeart, Trash2 } from "lucide-react";
import ConfirmAction from "@/components/admin/confirm-action";
import { closeLot } from "@/lib/server-actions/anti-gaspi-admin-actions";

// Clôture d'un lot : les unités restantes sont données ou jetées, et quittent le stock
export default function LotActions({ lotId, productName, quantity }: { lotId: string; productName: string; quantity: number }) {
  const units = `${quantity} unité${quantity > 1 ? "s" : ""}`;
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction
        tone="brand"
        trigger={
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-full border border-bio px-3 text-xs font-bold text-bio transition-colors hover:bg-bio/10"
          >
            <HandHeart size={14} aria-hidden /> Donné
          </button>
        }
        title="Lot donné ?"
        description={`${units} de « ${productName} » données à une association quittent le stock du magasin.`}
        confirmLabel="Lot donné"
        successMessage="Lot clos : unités données."
        action={() => closeLot(lotId, "donated")}
      />
      <ConfirmAction
        trigger={
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-full border border-promo/50 px-3 text-xs font-bold text-promo transition-colors hover:bg-promo/10"
          >
            <Trash2 size={14} aria-hidden /> Jeté
          </button>
        }
        title="Lot jeté ?"
        description={`${units} de « ${productName} » jetées quittent le stock du magasin et comptent comme gaspillées.`}
        confirmLabel="Lot jeté"
        successMessage="Lot clos : unités jetées."
        action={() => closeLot(lotId, "wasted")}
      />
    </div>
  );
}
