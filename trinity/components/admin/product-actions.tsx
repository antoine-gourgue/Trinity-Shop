"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { deleteProduct, setProductHidden } from "@/lib/server-actions/admin-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ConfirmAction from "./confirm-action";

const ICON_BUTTON =
  "flex h-9 w-9 items-center justify-center rounded-full border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60";

// Met un produit en ligne ou le retire du catalogue, sans le supprimer
export function VisibilityButton({ productId, hidden }: { productId: string; hidden: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const result = await setProductHidden(productId, !hidden);
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      toast({ description: hidden ? "Produit remis en ligne." : "Produit masqué du catalogue." });
      router.refresh();
    });

  const label = hidden ? "Remettre en ligne" : "Masquer du catalogue";
  return (
    <button type="button" onClick={toggle} disabled={isPending} aria-label={label} title={label} className={ICON_BUTTON}>
      {isPending ? (
        <Loader2 size={16} className="animate-spin" aria-hidden />
      ) : hidden ? (
        <Eye size={16} aria-hidden />
      ) : (
        <EyeOff size={16} aria-hidden />
      )}
    </button>
  );
}

export function DeleteProductButton({
  productId,
  name,
  label = false,
  redirectTo,
}: {
  productId: string;
  name: string;
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
          <button type="button" aria-label={`Supprimer ${name}`} title="Supprimer" className={cn(ICON_BUTTON, "hover:border-promo hover:text-promo")}>
            <Trash2 size={16} aria-hidden />
          </button>
        )
      }
      title="Supprimer ce produit ?"
      description={
        <>
          « {name} » sera supprimé définitivement, avec son stock. Un produit déjà commandé ne peut pas être supprimé :
          masquez-le plutôt pour le retirer du catalogue.
        </>
      }
      confirmLabel="Supprimer"
      successMessage="Produit supprimé."
      action={() => deleteProduct(productId)}
      redirectTo={redirectTo}
    />
  );
}
