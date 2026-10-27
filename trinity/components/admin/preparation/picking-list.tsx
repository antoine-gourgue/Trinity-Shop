"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Minus, PackageX, Plus, Repeat2, X } from "lucide-react";
import ConfirmAction from "@/components/admin/confirm-action";
import { ProductThumb } from "@/components/admin/product-thumb";
import { formatBrand, formatPrice } from "@/lib/format";
import { lineOutcome, preparationSummary } from "@/lib/orders/preparation";
import {
  finishPreparation,
  getSubstituteOptions,
  setPreparedQuantity,
  setSubstitute,
  type PreparationResult,
  type SubstituteOption,
} from "@/lib/server-actions/preparation-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface PickingLine {
  id: string;
  quantity: number;
  preparedQuantity: number | null;
  allowSubstitute: boolean;
  substitute: { id: string; name: string; price: number; netContent: string | null } | null;
  product: { name: string; price: number; picture: string; netContent: string | null; barCode: string; brand: string };
  rayon: string;
}

interface PickingListProps {
  orderId: string;
  lines: PickingLine[];
  // Commande encore en préparation ; sinon le relevé est en lecture seule
  editable: boolean;
  // Montant déjà remboursé à la validation, en millièmes d'euro
  refunded: number;
}

// Liste de prélèvement : chaque article est prélevé, partiellement prélevé ou signalé manquant,
// et un produit équivalent peut le remplacer si le client l'accepte
export default function PickingList({ orderId, lines, editable, refunded }: PickingListProps) {
  const router = useRouter();
  // Une action à la fois : les clics rapides s'enchaînent au lieu de se croiser
  const [lastLine, setLastLine] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const summary = preparationSummary(lines);
  const treated = lines.length - summary.pending;

  // L'action recharge elle-même la page (revalidatePath) ; en cas de refus, on relit la commande
  const run = (lineId: string, action: () => Promise<PreparationResult>) => {
    setLastLine(lineId);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        router.refresh();
      }
    });
  };

  const rayons = [...new Set(lines.map((line) => line.rayon))];

  return (
    <>
      <div className="space-y-6">
        {rayons.map((rayon) => (
          <section key={rayon}>
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{rayon}</h2>
            <ul className="space-y-3">
              {lines
                .filter((line) => line.rayon === rayon)
                .map((line) => (
                  <PickingItem
                    key={line.id}
                    line={line}
                    editable={editable}
                    pending={pending}
                    busy={pending && lastLine === line.id}
                    run={run}
                  />
                ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Avancement et validation, toujours visibles en bas de l'écran */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 md:px-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">
              {treated} article{treated > 1 ? "s" : ""} traité{treated > 1 ? "s" : ""} sur {lines.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {editable
                ? summary.refund > 0
                  ? `À rembourser au client : ${formatPrice(summary.refund)}`
                  : "Rien à rembourser pour l'instant"
                : refunded > 0
                  ? `Préparation validée · ${formatPrice(refunded)} remboursés au client`
                  : "Préparation validée"}
            </p>
          </div>
          {editable && (
            <ConfirmAction
              tone="brand"
              trigger={
                <button
                  type="button"
                  disabled={!summary.done || pending}
                  className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={16} aria-hidden /> Valider la préparation
                </button>
              }
              title="Valider la préparation ?"
              description={
                summary.changes.length === 0
                  ? "Tous les articles sont prélevés : la commande passe « prête » et le client est prévenu."
                  : `${summary.changes.length} article${summary.changes.length > 1 ? "s" : ""} modifié${summary.changes.length > 1 ? "s" : ""}${
                      summary.refund > 0 ? `, ${formatPrice(summary.refund)} remboursés sur la carte du client` : ""
                    }. La commande passe « prête », le stock du magasin est corrigé et le client reçoit le détail par e-mail.`
              }
              confirmLabel="Valider"
              successMessage="Préparation validée : le client est prévenu."
              action={() => finishPreparation(orderId)}
              redirectTo="/admin/preparation"
            />
          )}
        </div>
      </div>
    </>
  );
}

function PickingItem({
  line,
  editable,
  pending,
  busy,
  run,
}: {
  line: PickingLine;
  editable: boolean;
  // Une action est en cours sur la commande
  pending: boolean;
  // Cette action porte sur cet article
  busy: boolean;
  run: (lineId: string, action: () => Promise<PreparationResult>) => void;
}) {
  const [options, setOptions] = useState<SubstituteOption[] | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const treated = line.preparedQuantity !== null;
  const { prepared, missing, substitute } = lineOutcome(line);

  const prepare = (quantity: number) => run(line.id, () => setPreparedQuantity(line.id, quantity));
  const loadOptions = async () => {
    setLoadingOptions(true);
    setOptions(await getSubstituteOptions(line.id));
    setLoadingOptions(false);
  };

  return (
    <li
      className={cn(
        "rounded-3xl border bg-white p-4",
        treated && missing === 0 && "border-bio/40 bg-bio/5",
        treated && missing > 0 && (substitute ? "border-highlight bg-highlight/10" : "border-promo/40 bg-promo/5")
      )}
    >
      <div className="flex items-start gap-3">
        <ProductThumb src={line.product.picture} alt="" />
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{line.product.name}</p>
          <p className="text-xs text-muted-foreground">
            {[formatBrand(line.product.brand), line.product.netContent, line.product.barCode].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {line.allowSubstitute ? "Remplacement accepté" : "Remplacement refusé"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-dark px-3 py-1 text-sm font-black text-white">×{line.quantity}</span>
      </div>

      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => prepare(line.quantity)}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors disabled:opacity-60",
              treated && missing === 0 ? "bg-bio text-white" : "border border-bio text-bio hover:bg-bio/10"
            )}
          >
            <Check size={16} aria-hidden /> Prélevé
          </button>
          {line.quantity > 1 && (
            <span className="flex h-10 items-center rounded-full border">
              <button
                type="button"
                aria-label="Un de moins"
                disabled={pending || prepared === 0}
                onClick={() => prepare(Math.max(0, (treated ? prepared : line.quantity) - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-40"
              >
                <Minus size={16} aria-hidden />
              </button>
              <span className="min-w-14 text-center text-sm font-bold">
                {treated ? prepared : "—"} / {line.quantity}
              </span>
              <button
                type="button"
                aria-label="Un de plus"
                disabled={pending || (treated && prepared === line.quantity)}
                onClick={() => prepare(Math.min(line.quantity, (treated ? prepared : 0) + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-40"
              >
                <Plus size={16} aria-hidden />
              </button>
            </span>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => prepare(0)}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors disabled:opacity-60",
              treated && prepared === 0 ? "bg-promo text-white" : "border border-promo/50 text-promo hover:bg-promo/10"
            )}
          >
            <PackageX size={16} aria-hidden /> Manquant
          </button>
          {busy && <Loader2 size={18} className="animate-spin text-muted-foreground" aria-hidden />}
        </div>
      )}

      {/* Quantité manquante : remplaçant si le client l'accepte, sinon remboursement */}
      {treated && missing > 0 && (
        <div className="mt-3 rounded-2xl bg-white/70 p-3 text-sm">
          {substitute ? (
            <p className="flex flex-wrap items-center gap-2">
              <Repeat2 size={16} className="text-brand-dark" aria-hidden />
              <span>
                {missing} remplacé{missing > 1 ? "s" : ""} par <span className="font-bold">{substitute.name}</span> (
                {formatPrice(substitute.price)})
              </span>
              {editable && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(line.id, () => setSubstitute(line.id, null))}
                  className="flex items-center gap-1 font-bold text-promo hover:underline"
                >
                  <X size={14} aria-hidden /> Retirer
                </button>
              )}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {missing} manquant{missing > 1 ? "s" : ""}, remboursé{missing > 1 ? "s" : ""} au client ({formatPrice(missing * line.product.price)})
              {!line.allowSubstitute && " · remplacement refusé par le client"}
            </p>
          )}

          {editable && line.allowSubstitute && !substitute && (
            <div className="mt-2">
              {options === null ? (
                <button
                  type="button"
                  onClick={() => void loadOptions()}
                  disabled={loadingOptions}
                  className="flex items-center gap-1.5 font-bold text-primary hover:underline"
                >
                  {loadingOptions ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Repeat2 size={14} aria-hidden />}
                  Choisir un remplaçant en stock
                </button>
              ) : options.length === 0 ? (
                <p className="text-muted-foreground">Aucun produit équivalent en stock dans ce magasin.</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {options.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(line.id, () => setSubstitute(line.id, option.id))}
                        className="flex w-full items-center gap-3 rounded-2xl border bg-white p-2 text-left transition-colors hover:border-primary"
                      >
                        <ProductThumb src={option.picture} alt="" size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{option.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {[option.netContent, `${option.stock} en stock`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="text-sm font-bold">{formatPrice(option.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
