"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Loader2, Store } from "lucide-react";
import CheckoutSteps from "@/components/cart/checkout-steps";
import CheckoutSummary from "@/components/cart/checkout-summary";
import { useCartSummary } from "@/components/cart/use-cart-summary";
import { PickupSlot, formatSlot, loadSlot, pickupDays, pickupHours, saveSlot, slotParam } from "@/lib/checkout";
import { cn } from "@/lib/utils";

export default function RetraitPage() {
    const router = useRouter();
    const { status } = useSession();
    const { cartProducts, totalItems, totalPrice, savings } = useCartSummary();

    // Jours calculés côté navigateur (fuseau horaire du client), puis créneau déjà choisi repris
    const [days, setDays] = useState<ReturnType<typeof pickupDays>>([]);
    const hours = pickupHours();
    const [selectedDay, setSelectedDay] = useState("");
    const [slot, setSlot] = useState<PickupSlot | null>(null);

    useEffect(() => {
        const available = pickupDays();
        const saved = loadSlot();
        setDays(available);
        if (saved && available.some((day) => day.date === saved.date)) {
            setSlot(saved);
            setSelectedDay(saved.date);
        } else {
            setSelectedDay(available[0].date);
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/cart");
    }, [status, router]);

    const chooseSlot = (start: number) => {
        const next = { date: selectedDay, start };
        setSlot(next);
        saveSlot(next);
    };

    if (status === "loading" || days.length === 0) {
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

    const selectedDayLabel = days.find((day) => day.date === selectedDay)?.label;

    return (
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Link href="/cart" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                    <ArrowLeft size={16} aria-hidden /> Retour au panier
                </Link>
                <CheckoutSteps current={1} />
            </div>

            <h1 className="mt-4 text-3xl font-black">Retrait de mes courses</h1>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-6">
                    <section className="rounded-3xl border bg-white p-5 md:p-6">
                        <h2 className="text-lg font-black">Mode de retrait</h2>
                        <div className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-primary bg-secondary/60 p-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Store size={22} aria-hidden />
                            </span>
                            <div className="flex-1">
                                <p className="font-extrabold">Drive Trinity U Rennes Epitech</p>
                                <p className="text-sm text-muted-foreground">
                                    Vos courses sont préparées par nos équipes, vous les récupérez sur place.
                                </p>
                            </div>
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check size={14} aria-hidden />
                            </span>
                        </div>
                    </section>

                    <section className="rounded-3xl border bg-white p-5 md:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-black">
                            <CalendarDays size={20} className="text-primary" aria-hidden />
                            Choisissez votre créneau
                        </h2>

                        <div role="tablist" aria-label="Jour de retrait" className="-mx-1 mt-3 flex gap-2 overflow-x-auto p-1">
                            {days.map((day) => {
                                const active = day.date === selectedDay;
                                return (
                                    <button
                                        key={day.date}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setSelectedDay(day.date)}
                                        className={cn(
                                            "flex min-w-[84px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition-colors",
                                            active ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:border-primary"
                                        )}
                                    >
                                        <span className="text-xs font-bold uppercase">{day.weekday}</span>
                                        <span className="text-base font-black">{day.day}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="mt-5 text-sm font-bold first-letter:uppercase">{selectedDayLabel}</p>
                        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                            {hours.map((start) => {
                                const active = slot?.date === selectedDay && slot.start === start;
                                return (
                                    <li key={start}>
                                        <button
                                            type="button"
                                            onClick={() => chooseSlot(start)}
                                            aria-pressed={active}
                                            className={cn(
                                                "flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border text-sm font-bold transition-colors",
                                                active
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "bg-white hover:border-primary hover:text-primary"
                                            )}
                                        >
                                            {active && <Check size={14} aria-hidden />}
                                            {start}h – {start + 1}h
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="mt-4 text-xs text-muted-foreground">Le retrait est gratuit, quel que soit le créneau.</p>
                    </section>
                </div>

                <CheckoutSummary
                    totalItems={totalItems}
                    totalPrice={totalPrice}
                    savings={savings}
                    slotLabel={slot ? formatSlot(slot) : null}
                >
                    <button
                        type="button"
                        disabled={!slot}
                        onClick={() => slot && router.push(`/cart/paiement?creneau=${slotParam(slot)}`)}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Continuer vers le paiement
                        <ArrowRight size={18} aria-hidden />
                    </button>
                    {!slot && <p className="mt-2 text-center text-xs text-muted-foreground">Choisissez un créneau pour continuer.</p>}
                </CheckoutSummary>
            </div>
        </div>
    );
}
