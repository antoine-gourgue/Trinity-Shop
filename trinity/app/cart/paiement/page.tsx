"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, CalendarClock, Check, CreditCard, Loader2, Lock, Pencil } from "lucide-react";
import CheckoutSteps from "@/components/cart/checkout-steps";
import CheckoutSummary from "@/components/cart/checkout-summary";
import { useCartSummary } from "@/components/cart/use-cart-summary";
import ProductImage from "@/components/product/product-image";
import { getActiveCartId } from "@/lib/server-actions/cart-actions";
import { formatSlot, parseSlotParam, saveSlot, slotParam } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";

const PAYMENT_METHODS = ["CB", "Visa", "Mastercard"];

function PaiementContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const slot = parseSlotParam(searchParams.get("creneau"));
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const billingAddress = session?.user?.billingAddress;
    const { cartProducts, totalItems, totalPrice, savings } = useCartSummary();

    const [cartId, setCartId] = useState<string | null>(null);
    const [paying, setPaying] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    const hasSlot = slot !== null;
    useEffect(() => {
        if (status === "unauthenticated") router.replace("/cart");
        else if (status === "authenticated" && !hasSlot) router.replace("/cart/retrait");
    }, [status, hasSlot, router]);

    useEffect(() => {
        if (!userId) return;
        getActiveCartId().then((response) => setCartId(response?.cartId ?? null));
    }, [userId, cartProducts.length]);

    // Paiement simulé : même flux de commande que PayPal, sans transaction réelle
    const handleSimulatedPayment = async () => {
        setPaymentError(null);
        if (!userId || !cartId || !slot) {
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
            saveSlot(null);
            window.location.href = order?.id
                ? `/user/${userId}/order/${order.id}?confirmation=1&creneau=${slotParam(slot)}`
                : `/user/${userId}/order`;
        } catch {
            setPaymentError("Une erreur est survenue pendant le paiement simulé.");
        } finally {
            setPaying(false);
        }
    };

    if (status !== "authenticated" || !slot) {
        return (
            <div className="flex justify-center py-24 text-muted-foreground">
                <Loader2 className="animate-spin" aria-label="Chargement" />
            </div>
        );
    }

    if (cartProducts.length === 0) {
        return (
            <div className="mx-auto max-w-lg px-4 py-14 text-center">
                <p className="text-lg font-extrabold">Votre panier est vide</p>
                <Link href="/" className="mt-3 inline-block font-bold text-primary hover:underline">
                    Commencer mes courses
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Link href="/cart/retrait" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                    <ArrowLeft size={16} aria-hidden /> Retour au créneau
                </Link>
                <CheckoutSteps current={2} />
            </div>

            <h1 className="mt-4 text-3xl font-black">Paiement</h1>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-6">
                    <section className="flex flex-wrap items-center gap-4 rounded-3xl border bg-white p-5 md:p-6">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                            <CalendarClock size={22} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Retrait au drive</p>
                            <p className="font-extrabold">{formatSlot(slot)}</p>
                            <p className="text-sm text-muted-foreground">Trinity U Rennes Epitech</p>
                        </div>
                        <Link
                            href="/cart/retrait"
                            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-secondary"
                        >
                            <Pencil size={15} aria-hidden /> Modifier
                        </Link>
                    </section>

                    <section className="rounded-3xl border bg-white p-5 md:p-6">
                        <h2 className="text-lg font-black">Moyen de paiement</h2>
                        <div className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-primary bg-secondary/60 p-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <CreditCard size={22} aria-hidden />
                            </span>
                            <div className="flex-1">
                                <p className="font-extrabold">Carte bancaire</p>
                                <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Cartes acceptées">
                                    {PAYMENT_METHODS.map((method) => (
                                        <li key={method} className="rounded-md border bg-white px-2 py-0.5 text-[11px] font-extrabold text-brand-dark">
                                            {method}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check size={14} aria-hidden />
                            </span>
                        </div>
                        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-highlight/25 px-4 py-3 text-sm">
                            <Lock size={16} className="mt-0.5 shrink-0 text-brand-dark" aria-hidden />
                            <span>
                                <span className="font-bold">Paiement de démonstration.</span> Aucune donnée bancaire n’est
                                demandée et aucun débit n’est effectué : la commande est validée directement.
                            </span>
                        </p>
                    </section>

                    <section className="rounded-3xl border bg-white p-5 md:p-6">
                        <h2 className="text-lg font-black">
                            Vos articles <span className="text-sm font-semibold text-muted-foreground">({totalItems})</span>
                        </h2>
                        <ul className="mt-3 divide-y">
                            {cartProducts.map((product) => (
                                <li key={product.id} className="flex items-center gap-3 py-3">
                                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-white">
                                        <ProductImage src={product.picture} alt={product.name} sizes="48px" className="p-1" />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{product.name}</span>
                                    <span className="text-sm text-muted-foreground">× {product.quantity}</span>
                                    <span className="w-20 text-right text-sm font-bold tabular-nums">
                                        {formatPrice(product.price * product.quantity)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                <CheckoutSummary totalItems={totalItems} totalPrice={totalPrice} savings={savings} slotLabel={formatSlot(slot)}>
                    <button
                        type="button"
                        onClick={handleSimulatedPayment}
                        disabled={paying || !cartId}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
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
                </CheckoutSummary>
            </div>
        </div>
    );
}

export default function PaiementPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-24 text-muted-foreground">
                    <Loader2 className="animate-spin" aria-label="Chargement" />
                </div>
            }
        >
            <PaiementContent />
        </Suspense>
    );
}
