"use client";

import { CheckCircle2 } from "lucide-react";
import ConfirmAction from "@/components/admin/confirm-action";
import { handOverOrder } from "@/lib/server-actions/drive-actions";

// Courses remises au client sur le parking : la commande est terminée
export default function HandOverButton({ orderId, customer }: { orderId: string; customer: string }) {
  return (
    <ConfirmAction
      tone="brand"
      trigger={
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
        >
          <CheckCircle2 size={16} aria-hidden /> Remis au client
        </button>
      }
      title={`Courses remises à ${customer} ?`}
      description="La commande passe « retirée » et le client reçoit un e-mail de remerciement."
      confirmLabel="Courses remises"
      successMessage="Commande remise au client."
      action={() => handOverOrder(orderId)}
    />
  );
}
