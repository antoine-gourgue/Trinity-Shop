"use client";

import { HandHeart, Trash2 } from "lucide-react";
import ConfirmAction from "@/components/admin/confirm-action";
import { closeLot } from "@/lib/server-actions/anti-gaspi-admin-actions";

interface LotActionsProps {
  lotId: string;
  productName: string;
  quantity: number;
  // Lot périmé : retiré de la vente, il ne peut plus qu'être jeté
  expired?: boolean;
}

// Clôture d'un lot : les unités restantes sont données (jusqu'au jour de la date) ou jetées
export default function LotActions({ lotId, productName, quantity, expired = false }: LotActionsProps) {
  const units = `${quantity} unité${quantity > 1 ? "s" : ""}`;
  return (
    <div className="flex flex-wrap gap-2">
      {!expired && (
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
          description={`${units} de « ${productName} » données à l'association partenaire quittent le stock du magasin.`}
          confirmLabel="Lot donné"
          successMessage="Lot clos : unités données."
          action={() => closeLot(lotId, "donated")}
        />
      )}
      <ConfirmAction
        trigger={
          <button
            type="button"
            className={
              expired
                ? "flex h-9 items-center gap-1.5 rounded-full bg-promo px-3 text-xs font-bold text-white transition-colors hover:bg-promo/90"
                : "flex h-9 items-center gap-1.5 rounded-full border border-promo/50 px-3 text-xs font-bold text-promo transition-colors hover:bg-promo/10"
            }
          >
            <Trash2 size={14} aria-hidden /> Jeté
          </button>
        }
        title={expired ? "Lot périmé jeté ?" : "Lot jeté ?"}
        description={
          expired
            ? `Confirmez que les ${units} de « ${productName} » ont été retirées du rayon et jetées : un produit périmé ne se donne plus. Elles comptent comme gaspillées.`
            : `${units} de « ${productName} » jetées quittent le stock du magasin et comptent comme gaspillées.`
        }
        confirmLabel={expired ? "Retiré et jeté" : "Lot jeté"}
        successMessage="Lot clos : unités jetées."
        action={() => closeLot(lotId, "wasted")}
      />
    </div>
  );
}
