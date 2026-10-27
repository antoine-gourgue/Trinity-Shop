"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Ban, Download, Loader2, Trash2 } from "lucide-react";
import { downloadInvoice } from "@/lib/download-invoice";
import { advanceOrderStatus, cancelOrder, deleteOrder } from "@/lib/server-actions/admin-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ConfirmAction from "./confirm-action";

const ICON_BUTTON =
  "flex h-9 w-9 items-center justify-center rounded-full border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60";

export function InvoiceButton({ orderId, label = false }: { orderId: string; label?: boolean }) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      await downloadInvoice(orderId);
    } catch {
      toast({ variant: "destructive", description: "La facture n'a pas pu être générée." });
    } finally {
      setLoading(false);
    }
  };

  const icon = loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />;
  return label ? (
    <button
      type="button"
      onClick={download}
      disabled={loading}
      className="flex h-11 items-center gap-2 rounded-full border bg-white px-5 text-sm font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
    >
      {icon} Facture PDF
    </button>
  ) : (
    <button type="button" onClick={download} disabled={loading} aria-label="Télécharger la facture" title="Facture PDF" className={ICON_BUTTON}>
      {icon}
    </button>
  );
}

export function CancelOrderButton({
  orderId,
  number,
  label = false,
  redirectTo,
}: {
  orderId: string;
  number: string;
  label?: boolean;
  redirectTo?: string;
}) {
  return (
    <ConfirmAction
      trigger={
        label ? (
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-full border border-promo/40 bg-white px-5 text-sm font-bold text-promo transition-colors hover:bg-promo hover:text-white"
          >
            <Ban size={16} aria-hidden /> Annuler la commande
          </button>
        ) : (
          <button type="button" aria-label={`Annuler la commande ${number}`} title="Annuler la commande" className={cn(ICON_BUTTON, "hover:border-promo hover:text-promo")}>
            <Ban size={16} aria-hidden />
          </button>
        )
      }
      title={`Annuler la commande #${number} ?`}
      description="La commande reste visible, marquée « Annulée ». Un paiement par carte est remboursé au client, ses articles sont remis en stock, les points Carte Trinity gagnés lui sont retirés, les bons utilisés lui sont rendus, et il est prévenu par e-mail."
      confirmLabel="Annuler la commande"
      successMessage={`Commande #${number} annulée.`}
      action={() => cancelOrder(orderId)}
      redirectTo={redirectTo}
    />
  );
}

// Suppression définitive, proposée pour une commande déjà annulée
export function DeleteOrderButton({
  orderId,
  number,
  label = false,
  redirectTo,
}: {
  orderId: string;
  number: string;
  label?: boolean;
  redirectTo?: string;
}) {
  return (
    <ConfirmAction
      trigger={
        label ? (
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-full border border-promo/40 bg-white px-5 text-sm font-bold text-promo transition-colors hover:bg-promo hover:text-white"
          >
            <Trash2 size={16} aria-hidden /> Supprimer
          </button>
        ) : (
          <button type="button" aria-label={`Supprimer la commande ${number}`} title="Supprimer la commande" className={cn(ICON_BUTTON, "hover:border-promo hover:text-promo")}>
            <Trash2 size={16} aria-hidden />
          </button>
        )
      }
      title={`Supprimer la commande #${number} ?`}
      description="La commande annulée et son panier seront supprimés définitivement."
      confirmLabel="Supprimer"
      successMessage={`Commande #${number} supprimée.`}
      action={() => deleteOrder(orderId)}
      redirectTo={redirectTo}
    />
  );
}

// Passe la commande à l'étape suivante de sa préparation
export function AdvanceOrderButton({ orderId, nextLabel }: { orderId: string; nextLabel: string }) {
  const [isPending, startTransition] = useTransition();

  const advance = () => {
    startTransition(async () => {
      const result = await advanceOrderStatus(orderId);
      toast(
        result.ok
          ? { description: `Commande passée à « ${nextLabel} ».` }
          : { variant: "destructive", description: result.error }
      );
    });
  };

  return (
    <button
      type="button"
      onClick={advance}
      disabled={isPending}
      className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
    >
      {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ArrowRight size={16} aria-hidden />}
      Passer à « {nextLabel} »
    </button>
  );
}
