"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, Lock, Minus, Plus, ShoppingBasket, Store, Trash2, UserRound } from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import { getActiveCartId } from "@/lib/server-actions/cart-actions";
import { formatPrice } from "@/lib/format";
import Price from "@/components/product/price";
import ProductImage from "@/components/product/product-image";
import { Button } from "@/components/ui/button";

export default function CartPage() {
    const { cartProducts, removeProduct, handleUpdateProductQuantity, refreshCart } = useCart();
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const billingAddress = session?.user?.billingAddress;

    const [cartId, setCartId] = useState<string | null>(null);
    const [paying, setPaying] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!userId) return;
        getActiveCartId().then((response) => setCartId(response?.cartId ?? null));
    }, [userId, cartProducts.length]);

    const totalItems = cartProducts.reduce((acc, product) => acc + product.quantity, 0);
    const totalPrice = cartProducts.reduce((acc, product) => acc + product.price * product.quantity, 0);

    const handleClearCart = () => {
        startTransition(async () => {
            for (const product of cartProducts) {
                await removeProduct(product.id);
            }
            await refreshCart();
        });
    };

    // Paiement simulé : même flux de commande que PayPal, sans transaction réelle
    const handleSimulatedPayment = async () => {
        setPaymentError(null);

        if (!userId) {
            setPaymentError("Connectez-vous pour finaliser la commande.");
            return;
        }
        if (!cartId) {
            setPaymentError("Aucun panier actif trouvé.");
            return;
        }

        setPaying(true);
        try {
            // Petit délai pour matérialiser l'étape de paiement
            await new Promise((resolve) => setTimeout(resolve, 1200));

            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, cartId, billingAddressId: billingAddress }),
            });

            if (!response.ok) {
                console.error("Erreur lors de la création de la commande", await response.json());
                setPaymentError("La commande n'a pas pu être créée. Réessayez.");
                return;
            }

            const { data: order } = await response.json();
            window.location.href = order?.id
                ? `/user/${userId}/order/${order.id}?confirmation=1`
                : `/user/${userId}/order`;
        } catch {
            setPaymentError("Une erreur est survenue pendant le paiement simulé.");
        } finally {
            setPaying(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="flex justify-center py-24 text-muted-foreground">
                <Loader2 className="animate-spin" aria-label="Chargement du panier" />
            </div>
        );
    }

    if (!session) {
        return (
            <EmptyState
                icon={<UserRound size={36} />}
                title="Connectez-vous pour retrouver votre panier"
                text="Votre panier est enregistré sur votre compte : retrouvez-le sur tous vos appareils."
            >
                <Button asChild size="lg" className="rounded-full px-6 font-bold">
                    <Link href="/api/auth/signin">Se connecter</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-6 font-bold">
                    <Link href="/auth">Créer un compte</Link>
                </Button>
            </EmptyState>
        );
    }

    if (cartProducts.length === 0) {
        return (
            <EmptyState
                icon={<ShoppingBasket size={36} />}
                title="Votre panier est vide"
                text="Parcourez nos rayons et ajoutez vos produits préférés pour commencer vos courses."
            >
                <Button asChild size="lg" className="rounded-full px-6 font-bold">
                    <Link href="/">Commencer mes courses</Link>
                </Button>
            </EmptyState>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
            <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                <ArrowLeft size={16} aria-hidden /> Continuer mes courses
            </Link>
            <h1 className="mt-3 text-3xl font-black">
                Mon panier <span className="text-lg font-bold text-muted-foreground">({totalItems} article{totalItems > 1 ? "s" : ""})</span>
            </h1>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <section aria-label="Articles du panier" className="rounded-3xl border bg-white">
                    <ul className="divide-y">
                        {cartProducts.map((product) => (
                            <li key={product.id} className="flex gap-4 p-4 sm:p-5">
                                <Link
                                    href={`/product/${product.id}`}
                                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-white sm:h-24 sm:w-24"
                                >
                                    <ProductImage src={product.picture} alt={product.name} sizes="96px" className="p-1.5" />
                                </Link>

                                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="min-w-0 flex-1">
                                        <Link href={`/product/${product.id}`} className="line-clamp-2 font-bold leading-snug hover:underline">
                                            {product.name}
                                        </Link>
                                        <p className="mt-1 text-sm text-muted-foreground">{formatPrice(product.price)} l’unité</p>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                                        <div className="flex h-10 items-center rounded-full border border-primary text-primary">
                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() => startTransition(() => handleUpdateProductQuantity(product.id, product.quantity - 1))}
                                                aria-label="Retirer un article"
                                                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="min-w-[2rem] text-center font-bold tabular-nums">{product.quantity}</span>
                                            <button
                                                type="button"
                                                disabled={isPending}
                                                onClick={() => startTransition(() => handleUpdateProductQuantity(product.id, product.quantity + 1))}
                                                aria-label="Ajouter un article"
                                                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>

                                        <span className="w-20 text-right text-lg font-black tabular-nums">
                                            {formatPrice(product.price * product.quantity)}
                                        </span>

                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => startTransition(() => removeProduct(product.id))}
                                            aria-label={`Supprimer ${product.name} du panier`}
                                            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-end border-t px-5 py-3">
                        <button
                            type="button"
                            onClick={handleClearCart}
                            disabled={isPending}
                            className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 size={14} aria-hidden /> Vider le panier
                        </button>
                    </div>
                </section>

                <aside className="rounded-3xl border bg-white p-6 lg:sticky lg:top-[140px]">
                    <h2 className="text-lg font-black">Récapitulatif</h2>

                    <dl className="mt-4 space-y-2.5 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})</dt>
                            <dd className="font-bold">{formatPrice(totalPrice)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Préparation de la commande</dt>
                            <dd className="font-bold text-bio">Offerte</dd>
                        </div>
                    </dl>

                    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-secondary p-3 text-sm">
                        <Store size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                        <p>
                            <span className="font-bold">Retrait au drive</span>
                            <br />
                            <span className="text-muted-foreground">Trinity U Rennes Epitech</span>
                        </p>
                    </div>

                    <div className="mt-5 flex items-end justify-between border-t pt-5">
                        <span className="font-extrabold">Total</span>
                        <Price value={totalPrice} size="lg" />
                    </div>

                    <button
                        type="button"
                        onClick={handleSimulatedPayment}
                        disabled={paying || !cartId}
                        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {paying ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Paiement en cours…
                            </>
                        ) : (
                            <>
                                <Lock size={16} />
                                Payer {formatPrice(totalPrice)}
                            </>
                        )}
                    </button>
                    {paymentError && <p className="mt-2 text-center text-sm text-destructive">{paymentError}</p>}
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                        Paiement de démonstration — aucun débit réel n’est effectué.
                    </p>
                </aside>
            </div>
        </div>
    );
}

function EmptyState({
    icon,
    title,
    text,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
    children: React.ReactNode;
}) {
    return (
        <div className="mx-auto w-full max-w-[1400px] px-4 py-10 md:px-6">
            <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl border bg-white px-6 py-14 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-primary">{icon}</div>
                <h1 className="text-2xl font-black">{title}</h1>
                <p className="text-muted-foreground">{text}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>
            </div>
        </div>
    );
}
