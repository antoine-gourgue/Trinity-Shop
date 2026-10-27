"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { correctStockCount } from "@/lib/server-actions/admin-actions";
import { toast } from "@/hooks/use-toast";

interface StockCountButtonProps {
  stockId: string;
  productName: string;
  quantity: number;
  // Date proposée pour des unités trouvées en plus (AAAA-MM-JJ), et premier jour accepté
  suggestedBestBefore: string;
  minBestBefore: string;
}

const inputClass = "h-11 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-primary";

// Correction après comptage en rayon : quantité comptée, et date des unités trouvées en plus
export default function StockCountButton({ stockId, productName, quantity, suggestedBestBefore, minBestBefore }: StockCountButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState(String(quantity));
  const [bestBefore, setBestBefore] = useState(suggestedBestBefore);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = Number(counted);
  const found = counted.trim() !== "" && Number.isInteger(value) && value > quantity;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await correctStockCount(stockId, { quantity: value, bestBefore: found ? bestBefore : null });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast({ description: `Stock de « ${productName} » corrigé : ${value} unité${value > 1 ? "s" : ""}.` });
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setCounted(String(quantity));
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ClipboardCheck size={14} aria-hidden /> Corriger après comptage
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Corriger après comptage</DialogTitle>
            <DialogDescription>
              {productName} : {quantity} unité{quantity > 1 ? "s" : ""} en stock. Les unités manquantes sortent des dates les plus
              courtes ; des unités trouvées en plus entrent comme un lot.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Quantité comptée</span>
              <input type="number" min={0} required value={counted} onChange={(event) => setCounted(event.target.value)} className={inputClass} />
            </label>
            {found && (
              <label className="block">
                <span className="mb-1 block text-sm font-bold">Date des unités en plus</span>
                <input type="date" min={minBestBefore} required value={bestBefore} onChange={(event) => setBestBefore(event.target.value)} className={inputClass} />
              </label>
            )}
          </div>
          {error && <p className="mt-3 rounded-2xl bg-promo/10 px-4 py-3 text-sm font-semibold text-promo">{error}</p>}
          <DialogFooter className="mt-5 gap-2 sm:gap-0">
            <button
              type="submit"
              disabled={pending || Number(counted) === quantity}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
              Enregistrer le comptage
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
