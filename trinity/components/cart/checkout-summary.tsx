import { CalendarClock, CreditCard, Leaf, Store } from "lucide-react";
import Price from "@/components/product/price";
import { formatPrice } from "@/lib/format";

interface CheckoutSummaryProps {
  totalItems: number;
  totalPrice: number;
  savings: number;
  slotLabel?: string | null;
  children: React.ReactNode;
}

// Récapitulatif affiché à droite de chaque étape de commande ; `children` porte l'action de l'étape
export default function CheckoutSummary({ totalItems, totalPrice, savings, slotLabel, children }: CheckoutSummaryProps) {
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
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Préparation de la commande</dt>
            <dd className="font-bold text-bio">Offerte</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-secondary p-3 text-sm">
          {slotLabel ? (
            <CalendarClock size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          ) : (
            <Store size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          )}
          <p>
            <span className="font-bold">Retrait au drive Trinity U Rennes Epitech</span>
            <br />
            <span className="text-muted-foreground">{slotLabel ?? "Créneau à choisir à l’étape suivante"}</span>
          </p>
        </div>

        <div className="mt-5 flex items-end justify-between border-t pt-5">
          <span className="font-extrabold">Total</span>
          <Price value={totalPrice} size="lg" />
        </div>
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
          <Store size={18} className="shrink-0 text-primary" aria-hidden />
          Commande préparée par nos équipes au drive
        </li>
        <li className="flex items-center gap-3">
          <Leaf size={18} className="shrink-0 text-primary" aria-hidden />
          Dates limites choisies avec soin
        </li>
      </ul>
    </aside>
  );
}
