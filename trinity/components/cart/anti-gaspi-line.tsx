"use client";

import { useTransition } from "react";
import { Recycle } from "lucide-react";
import { removeAntiGaspiOffer } from "@/lib/server-actions/anti-gaspi-actions";
import type { CartItemDetails } from "@/lib/server-actions/cart-details-actions";
import { formatPrice } from "@/lib/format";

interface AntiGaspiLineProps {
  productId: string;
  quantity: number;
  offer: NonNullable<CartItemDetails["antiGaspi"]>;
  // Relit les détails du panier une fois l'offre retirée
  onChange: () => void;
}

// Offre anti-gaspi d'une ligne du panier : unités à date courte, remise et renoncement possible
export default function AntiGaspiLine({ productId, quantity, offer, onChange }: AntiGaspiLineProps) {
  const [pending, startTransition] = useTransition();
  const units = Math.min(quantity, offer.lotQuantity);
  const remove = () =>
    startTransition(async () => {
      await removeAntiGaspiOffer(productId);
      onChange();
    });

  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${offer.active ? "bg-bio/10 text-bio" : "bg-muted text-muted-foreground"}`}>
        <Recycle size={12} aria-hidden />
        {offer.active
          ? `Anti-gaspi −${offer.percent} % sur ${units} · − ${formatPrice(units * offer.unitDiscount)}`
          : "Offre anti-gaspi terminée : prix normal"}
      </span>
      {offer.active && <span className="text-muted-foreground">date limite {offer.bestBefore}</span>}
      <button type="button" onClick={remove} disabled={pending} className="font-bold text-primary hover:underline disabled:opacity-60">
        Retirer l’offre
      </button>
    </p>
  );
}
