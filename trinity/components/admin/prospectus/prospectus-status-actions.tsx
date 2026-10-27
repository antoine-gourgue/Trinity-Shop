"use client";

import { CircleStop, Send, Trash2, Undo2 } from "lucide-react";
import ConfirmAction from "@/components/admin/confirm-action";
import { deleteProspectus, publishProspectus, stopProspectus, unpublishProspectus } from "@/lib/server-actions/prospectus-actions";
import type { ProspectusStatus } from "@/lib/prospectus-rules";

interface ProspectusStatusActionsProps {
  id: string;
  title: string;
  status: ProspectusStatus;
  // Le prospectus peut-il encore être publié (dates à venir, au moins un produit) ?
  publishable: boolean;
}

const button = "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors";

// Actions d'un prospectus selon son statut : publier un brouillon, dépublier un prospectus programmé,
// arrêter un prospectus en cours, supprimer ce qui ne court pas
export default function ProspectusStatusActions({ id, title, status, publishable }: ProspectusStatusActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" && publishable && (
        <ConfirmAction
          tone="brand"
          trigger={
            <button type="button" className={`${button} border-primary bg-primary text-primary-foreground hover:bg-brand-dark`}>
              <Send size={14} aria-hidden /> Publier
            </button>
          }
          title="Publier le prospectus ?"
          description={`« ${title} » s'affichera sur l'accueil du magasin et ses prix s'appliqueront pendant ses dates.`}
          confirmLabel="Publier"
          successMessage="Prospectus publié."
          action={() => publishProspectus(id)}
        />
      )}
      {status === "scheduled" && (
        <ConfirmAction
          tone="brand"
          trigger={
            <button type="button" className={`${button} hover:bg-secondary`}>
              <Undo2 size={14} aria-hidden /> Repasser en brouillon
            </button>
          }
          title="Repasser en brouillon ?"
          description={`« ${title} » ne commencera pas tant qu'il n'est pas publié de nouveau.`}
          confirmLabel="Repasser en brouillon"
          successMessage="Prospectus repassé en brouillon."
          action={() => unpublishProspectus(id)}
        />
      )}
      {status === "running" && (
        <ConfirmAction
          trigger={
            <button type="button" className={`${button} border-promo/50 text-promo hover:bg-promo/10`}>
              <CircleStop size={14} aria-hidden /> Arrêter
            </button>
          }
          title="Arrêter le prospectus ?"
          description={`Les prix de « ${title} » cessent tout de suite ; les commandes déjà passées gardent leurs prix.`}
          confirmLabel="Arrêter maintenant"
          successMessage="Prospectus arrêté."
          action={() => stopProspectus(id)}
        />
      )}
      {status !== "running" && (
        <ConfirmAction
          trigger={
            <button type="button" aria-label={`Supprimer ${title}`} className={`${button} text-muted-foreground hover:border-promo/50 hover:text-promo`}>
              <Trash2 size={14} aria-hidden />
            </button>
          }
          title="Supprimer le prospectus ?"
          description={`« ${title} » et sa liste de produits seront supprimés.`}
          confirmLabel="Supprimer"
          successMessage="Prospectus supprimé."
          action={() => deleteProspectus(id)}
        />
      )}
    </div>
  );
}
