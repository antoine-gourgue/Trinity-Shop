"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import { Button } from "@/components/ui/button";
import Price from "@/components/product/price";
import { formatPrice } from "@/lib/format";

interface CartSheetContentProps {
  onNavigate?: () => void;
}

export default function CartSheetContent({ onNavigate }: CartSheetContentProps) {
  const { cartProducts, removeProduct, handleUpdateProductQuantity } = useCart();
  const [isPending, startTransition] = useTransition();

  const totalItems = cartProducts.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cartProducts.reduce(
    (acc, product) => acc + product.price * product.quantity,
    0
  );

  if (cartProducts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-primary">
          <ShoppingBasket size={36} />
        </div>
        <div>
          <p className="text-lg font-bold">Votre panier est vide</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez des produits pour commencer vos courses.
          </p>
        </div>
        <Button asChild className="rounded-full px-6 font-bold">
          <Link href="/" onClick={onNavigate}>
            Commencer mes courses
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul className="flex-1 divide-y overflow-y-auto px-4">
        {cartProducts.map((product) => (
          <li key={product.id} className="flex gap-3 py-4">
            <Link
              href={`/product/${product.id}`}
              onClick={onNavigate}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white"
            >
              <Image
                src={product.picture}
                alt={product.name}
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm font-semibold leading-5">{product.name}</p>
                <span className="shrink-0 text-sm font-extrabold">
                  {formatPrice(product.price * product.quantity)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex h-8 items-center rounded-full border border-primary text-primary">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => handleUpdateProductQuantity(product.id, product.quantity - 1))
                    }
                    aria-label="Retirer un article"
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums">
                    {product.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => handleUpdateProductQuantity(product.id, product.quantity + 1))
                    }
                    aria-label="Ajouter un article"
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                  >
                    <Plus size={14} />
                  </button>
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
          </li>
        ))}
      </ul>

      <div className="border-t bg-muted/60 p-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Total estimé ({totalItems} article{totalItems > 1 ? "s" : ""})
          </span>
          <Price value={totalPrice} />
        </div>
        <Button asChild size="lg" className="mt-4 w-full rounded-full text-base font-bold">
          <Link href="/cart" onClick={onNavigate}>
            Voir mon panier
          </Link>
        </Button>
      </div>
    </>
  );
}
