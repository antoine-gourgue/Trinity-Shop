"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, BadgePercent, Minus, Plus, ShoppingBasket, Store, Trash2 } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import { useCartSummary } from "@/components/cart/use-cart-summary";
import Price from "@/components/product/price";
import ProductImage from "@/components/product/product-image";
import AddToCartButton from "@/components/product/add-to-cart-button";
import { CartSuggestion, getPromoSuggestions } from "@/lib/server-actions/cart-details-actions";
import { discountPercent, formatBrand, formatPrice } from "@/lib/format";
import { formatUnitPrice } from "@/lib/product-info";

interface CartSheetContentProps {
  onNavigate?: () => void;
}

// Contenu du panier latéral (desktop) et du tiroir mobile
export default function CartSheetContent({ onNavigate }: CartSheetContentProps) {
  const { removeProduct, handleUpdateProductQuantity } = useCart();
  const { cartProducts, details, totalItems, totalPrice, savings } = useCartSummary();
  const [isPending, startTransition] = useTransition();

  if (cartProducts.length === 0) {
    return <EmptyCart onNavigate={onNavigate} />;
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b bg-secondary/60 px-5 py-2.5 text-xs">
        <Store size={15} className="shrink-0 text-primary" aria-hidden />
        <span>
          <span className="font-bold">Retrait au drive</span>
          <span className="text-muted-foreground"> · préparation offerte</span>
        </span>
      </div>

      <ul className="flex-1 divide-y overflow-y-auto px-5">
        {cartProducts.map((product) => {
          const info = details[product.id];
          const discount = discountPercent(product.price, info?.regularPrice);
          const meta = [info?.netContent, formatUnitPrice(product.price, info?.netContent)].filter(Boolean).join(" · ");

          return (
            <li key={product.id} className="flex gap-3 py-4">
              <Link
                href={`/product/${product.id}`}
                onClick={onNavigate}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white"
              >
                <ProductImage src={product.picture} alt={product.name} sizes="64px" className="p-1" />
                {discount && (
                  <span className="absolute left-0 top-0 rounded-br-lg bg-promo px-1 text-[10px] font-black text-white">
                    -{discount}%
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div>
                  {info?.brand && (
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-primary">{formatBrand(info.brand)}</p>
                  )}
                  <p className="line-clamp-2 text-sm font-semibold leading-5">{product.name}</p>
                  {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-8 items-center rounded-full border border-primary text-primary">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(() => handleUpdateProductQuantity(product.id, product.quantity - 1))}
                      aria-label="Retirer un article"
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums">{product.quantity}</span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(() => handleUpdateProductQuantity(product.id, product.quantity + 1))}
                      aria-label="Ajouter un article"
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="text-right">
                      {discount && info?.regularPrice && (
                        <p className="text-[11px] leading-none text-muted-foreground line-through">
                          {formatPrice(info.regularPrice * product.quantity)}
                        </p>
                      )}
                      <p className={`text-sm font-extrabold tabular-nums ${discount ? "text-promo" : ""}`}>
                        {formatPrice(product.price * product.quantity)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(() => removeProduct(product.id))}
                      aria-label={`Supprimer ${product.name} du panier`}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t bg-white p-5">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
            </dt>
            <dd className="font-semibold">{formatPrice(totalPrice + savings)}</dd>
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
        <div className="mt-3 flex items-end justify-between border-t pt-3">
          <span className="font-extrabold">Total</span>
          <Price value={totalPrice} />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/cart/retrait"
            onClick={onNavigate}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
          >
            Valider mon panier <ArrowRight size={18} aria-hidden />
          </Link>
          <Link
            href="/cart"
            onClick={onNavigate}
            className="flex h-10 items-center justify-center rounded-full text-sm font-bold text-primary transition-colors hover:bg-secondary"
          >
            Voir le détail du panier
          </Link>
        </div>
      </div>
    </>
  );
}

// Panier vide : message centré, un seul appel à l'action et quelques promos à ajouter directement
function EmptyCart({ onNavigate }: CartSheetContentProps) {
  const [promos, setPromos] = useState<CartSuggestion[]>([]);

  useEffect(() => {
    getPromoSuggestions(4).then(setPromos);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-secondary/60" aria-hidden />
          <span className="absolute inset-4 rounded-full bg-secondary" aria-hidden />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <ShoppingBasket size={30} aria-hidden />
          </span>
        </div>
        <p className="mt-6 text-xl font-black">Votre panier est vide</p>
        <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
          Ajoutez des produits pour commencer vos courses, ils apparaîtront ici.
        </p>
        <Link
          href="/"
          onClick={onNavigate}
          className="mt-6 flex h-12 w-full max-w-[280px] items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
        >
          Commencer mes courses <ArrowRight size={18} aria-hidden />
        </Link>
      </div>

      {promos.length > 0 && (
        <section className="border-t bg-muted/50 px-5 pb-6 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 font-extrabold">
              <BadgePercent size={18} className="text-promo" aria-hidden />
              Les promos du moment
            </p>
            <Link href="/produits?promo=1" onClick={onNavigate} className="text-sm font-bold text-primary hover:underline">
              Tout voir
            </Link>
          </div>
          <ul className="space-y-2">
            {promos.map((product) => {
              const discount = discountPercent(product.price, product.regularPrice);
              return (
                <li key={product.id} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 pr-3 shadow-sm">
                  <Link
                    href={`/product/${product.id}`}
                    onClick={onNavigate}
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white"
                  >
                    <ProductImage src={product.picture} alt={product.name} sizes="56px" className="p-1" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="mt-0.5 flex items-baseline gap-2 text-sm">
                      <span className="font-extrabold text-promo">{formatPrice(product.price)}</span>
                      {product.regularPrice && (
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(product.regularPrice)}</span>
                      )}
                      {discount && <span className="text-xs font-bold text-promo">-{discount} %</span>}
                    </p>
                  </div>
                  <AddToCartButton productId={product.id} productName={product.name} className="h-9 px-3" />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
