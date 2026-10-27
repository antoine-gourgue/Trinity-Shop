"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck } from "lucide-react";
import { orderRestock } from "@/lib/server-actions/restock-actions";
import { toast } from "@/hooks/use-toast";

// Commande en un clic de la quantité suggérée
export default function QuickOrderButton({ storeId, productId, productName, quantity }: { storeId: string; productId: string; productName: string; quantity: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const order = () =>
    startTransition(async () => {
      const result = await orderRestock({ storeId, productId, quantity });
      toast(
        result.ok
          ? { description: `Réassort commandé : ${quantity} × ${productName}, livré demain.` }
          : { variant: "destructive", description: result.error }
      );
      router.refresh();
    });

  return (
    <button
      type="button"
      onClick={order}
      disabled={pending || quantity <= 0}
      aria-label={`Commander ${quantity} ${productName}`}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary px-3 text-xs font-bold text-primary transition-colors hover:bg-secondary disabled:opacity-60"
    >
      {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Truck size={14} aria-hidden />}
      Commander {quantity}
    </button>
  );
}
