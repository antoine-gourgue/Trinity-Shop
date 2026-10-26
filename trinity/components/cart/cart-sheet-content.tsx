"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, Minus, Plus, ShoppingBasket, Store, Trash2 } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import { useCartSummary } from "@/components/cart/use-cart-summary";
import Price from "@/components/product/price";
import ProductImage from "@/components/product/product-image";
import { discountPercent, formatBrand, formatPrice } from "@/lib/format";
import { formatUnitPrice } from "@/lib/product-info";
import { RAYON_LINKS } from "@/lib/rayons";

interface CartSheetContentProps {
  onNavigate?: () => void;
}

// Contenu du panier latéral (desktop) et du tiroir mobile
export default function CartSheetContent({ onNavigate }: CartSheetContentProps) {
  const { removeProduct, handleUpdateProductQuantity } = useCart();
  const { cartProducts, details, totalItems, totalPrice, savings } = useCartSummary();
  const [isPending, startTransition] = useTransition();

  if (cartProducts.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-primary">
            <ShoppingBasket size={44} aria-hidden />
            <span className="absolute -right-1 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-highlight text-sm font-black text-brand-dark">
              0
            </span>
          </div>
          <p className="mt-2 text-xl font-black">Votre panier est vide</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Remplissez-le en parcourant nos rayons, ou laissez-vous tenter par les promos du moment.
          </p>
          <div className="mt-2 flex w-full flex-col gap-2">
            <Link
              href="/"
              onClick={onNavigate}
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
            >
              Commencer mes courses
            </Link>
            <Link
              href="/produits?promo=1"
              onClick={onNavigate}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-promo/40 px-5 text-sm font-bold text-promo transition-colors hover:bg-promo/10"
            >
              <BadgePercent size={16} aria-hidden /> Voir les promos
            </Link>
          </div>
        </div>

        <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-brand-dark">Nos rayons</p>
        <ul className="grid grid-cols-3 gap-2">
          {RAYON_LINKS.map((rayon) => (
            <li key={rayon.slug}>
              <Link
                href={rayon.href}
                onClick={onNavigate}
                className="flex h-full flex-col items-center gap-1.5 rounded-2xl bg-muted/70 p-2.5 text-center transition-colors hover:bg-secondary"
              >
                <Image src={rayon.image} alt="" width={32} height={32} className="h-8 w-auto object-contain" />
                <span className="text-[11px] font-bold leading-tight text-brand-dark">{rayon.shortName}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
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
