"use client";

import { X } from "lucide-react";
import ConfirmAction from "@/components/admin/confirm-action";
import { cancelRestock } from "@/lib/server-actions/restock-actions";

// Annulation d'une commande de réassort pas encore réceptionnée
export default function CancelRestockButton({ orderId, productName }: { orderId: string; productName: string }) {
  return (
    <ConfirmAction
      trigger={
        <button
          type="button"
          aria-label={`Annuler le réassort de ${productName}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-promo hover:text-promo"
        >
          <X size={14} aria-hidden />
        </button>
      }
      title="Annuler ce réassort ?"
      description={`La commande de « ${productName} » est annulée ; rien n'entre en stock.`}
      confirmLabel="Annuler le réassort"
      successMessage="Réassort annulé."
      action={() => cancelRestock(orderId)}
    />
  );
}
