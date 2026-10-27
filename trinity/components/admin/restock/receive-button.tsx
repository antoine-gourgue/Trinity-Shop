"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackageCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { receiveRestock } from "@/lib/server-actions/restock-actions";
import { toast } from "@/hooks/use-toast";

interface ReceiveButtonProps {
  orderId: string;
  productName: string;
  quantity: number;
  // Date proposée (AAAA-MM-JJ) : la durée de conservation habituelle du produit, et le premier jour accepté
  suggestedBestBefore: string;
  minBestBefore: string;
}

const inputClass = "h-11 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-primary";

// Réception d'une livraison : quantité reçue et date limite lue sur les colis, puis entrée en stock
export default function ReceiveButton({ orderId, productName, quantity, suggestedBestBefore, minBestBefore }: ReceiveButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [received, setReceived] = useState(String(quantity));
  const [bestBefore, setBestBefore] = useState(suggestedBestBefore);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await receiveRestock(orderId, { quantity: Number(received), bestBefore });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast({ description: `Réception enregistrée : ${received} × ${productName} en stock.` });
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
        >
          <PackageCheck size={14} aria-hidden /> Réceptionner
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Réceptionner la livraison</DialogTitle>
            <DialogDescription>
              {productName} : vérifiez la quantité reçue et la date limite indiquée sur les colis. Le lot entre en stock.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Quantité reçue</span>
              <input type="number" min={1} required value={received} onChange={(event) => setReceived(event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Date limite du lot</span>
              <input type="date" min={minBestBefore} required value={bestBefore} onChange={(event) => setBestBefore(event.target.value)} className={inputClass} />
            </label>
          </div>
          {error && <p className="mt-3 rounded-2xl bg-promo/10 px-4 py-3 text-sm font-semibold text-promo">{error}</p>}
          <DialogFooter className="mt-5 gap-2 sm:gap-0">
            <button
              type="submit"
              disabled={pending}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
              Valider la réception
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
