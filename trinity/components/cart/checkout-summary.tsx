"use client";

import { CalendarClock, Coins, CreditCard, Leaf, Store, Truck } from "lucide-react";
import { useStoreChoice } from "@/components/store/store-provider";
import Price from "@/components/product/price";
import { formatPrice } from "@/lib/format";
import { FREE_DELIVERY_FROM, type Fulfillment } from "@/lib/delivery";

interface CheckoutSummaryProps {
  totalItems: number;
  totalPrice: number;
  savings: number;
  slotLabel?: string | null;
  loyaltyDiscount?: number;
  // Remise anti-gaspi (articles à date courte)
  antiGaspiDiscount?: number;
  // Points Carte Trinity que la commande rapportera (null : pas de carte)
  pointsToEarn?: number | null;
  // Mode choisi ; sans précision, la commande est un retrait au drive
  fulfillment?: { mode: Fulfillment; fee: number; address?: string | null };
  children: React.ReactNode;
}

// Récapitulatif affiché à droite de chaque étape de commande ; `children` porte l'action de l'étape
export default function CheckoutSummary({
  totalItems,
  totalPrice,
  savings,
  slotLabel,
  loyaltyDiscount = 0,
  antiGaspiDiscount = 0,
  pointsToEarn,
  fulfillment = { mode: "pickup", fee: 0 },
  children,
}: CheckoutSummaryProps) {
  const { store } = useStoreChoice();
  const delivery = fulfillment.mode === "delivery";
  const total = totalPrice - antiGaspiDiscount - loyaltyDiscount + fulfillment.fee;

  return (
    <aside className="space-y-4 lg:sticky lg:top-[140px]">
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-lg font-black">Récapitulatif</h2>

        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
            </dt>
            <dd className="font-bold">{formatPrice(totalPrice + savings)}</dd>
          </div>
          {savings > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Remises promotions</dt>
              <dd className="font-bold text-promo">− {formatPrice(savings)}</dd>
            </div>
          )}
          {antiGaspiDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Remise anti-gaspi</dt>
              <dd className="font-bold text-bio">− {formatPrice(antiGaspiDiscount)}</dd>
            </div>
          )}
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Bons Carte Trinity</dt>
              <dd className="font-bold text-promo">− {formatPrice(loyaltyDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Préparation de la commande</dt>
            <dd className="font-bold text-bio">Offerte</dd>
          </div>
          {delivery && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Livraison à domicile</dt>
              <dd className={fulfillment.fee > 0 ? "font-bold" : "font-bold text-bio"}>
                {fulfillment.fee > 0 ? formatPrice(fulfillment.fee) : "Offerte"}
              </dd>
            </div>
          )}
        </dl>

        {delivery && fulfillment.fee > 0 && (
          <p className="mt-3 rounded-xl bg-highlight/25 px-3 py-2 text-center text-xs font-bold text-brand-dark">
            Plus que {formatPrice(FREE_DELIVERY_FROM - totalPrice)} d’articles pour la livraison offerte
          </p>
        )}

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-secondary p-3 text-sm">
          {delivery ? (
            <Truck size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          ) : slotLabel ? (
            <CalendarClock size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          ) : (
            <Store size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          )}
          <p className="min-w-0">
            <span className="font-bold">{delivery ? "Livraison à domicile" : `Retrait au drive ${store?.name ?? "Trinity"}`}</span>
            {delivery && fulfillment.address && (
              <>
                <br />
                <span className="text-muted-foreground">{fulfillment.address}</span>
              </>
            )}
            <br />
            <span className="text-muted-foreground">{slotLabel ?? "Créneau à choisir à l’étape suivante"}</span>
          </p>
        </div>

        <div className="mt-5 flex items-end justify-between border-t pt-5">
          <span className="font-extrabold">Total</span>
          <Price value={total} size="lg" />
        </div>
        {pointsToEarn !== undefined && pointsToEarn !== null && pointsToEarn > 0 && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-dark">
            <Coins size={16} className="text-highlight" aria-hidden />
            Cette commande vous rapportera {pointsToEarn} point{pointsToEarn > 1 ? "s" : ""}
          </p>
        )}
        {savings > 0 && (
          <p className="mt-3 rounded-xl bg-promo/10 px-3 py-2 text-center text-sm font-bold text-promo">
            Vous économisez {formatPrice(savings)} grâce aux promos
          </p>
        )}

        <div className="mt-5">{children}</div>
      </div>

      <ul className="space-y-3 rounded-3xl border bg-white p-5 text-sm">
        <li className="flex items-center gap-3">
          <CreditCard size={18} className="shrink-0 text-primary" aria-hidden />
          Paiement sécurisé : CB, Visa, Mastercard
        </li>
        <li className="flex items-center gap-3">
          {delivery ? (
            <Truck size={18} className="shrink-0 text-primary" aria-hidden />
          ) : (
            <Store size={18} className="shrink-0 text-primary" aria-hidden />
          )}
          {delivery ? `Livraison offerte dès ${formatPrice(FREE_DELIVERY_FROM)} d’articles` : "Commande préparée par nos équipes au drive"}
        </li>
        <li className="flex items-center gap-3">
          <Leaf size={18} className="shrink-0 text-primary" aria-hidden />
          Dates limites choisies avec soin
        </li>
      </ul>
    </aside>
  );
}
