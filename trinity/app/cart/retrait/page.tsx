"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Loader2, MapPin, Store, Truck } from "lucide-react";
import CheckoutSteps from "@/components/cart/checkout-steps";
import CheckoutSummary from "@/components/cart/checkout-summary";
import { useCartSummary } from "@/components/cart/use-cart-summary";
import { useLoyalty } from "@/components/cart/use-loyalty";
import AddAddressModal from "@/app/user/modal/AddAddressModal";
import StoreButton from "@/components/store/store-button";
import { useStoreChoice } from "@/components/store/store-provider";
import { pointsForAmount } from "@/lib/loyalty";
import { getFullSlots, getMyAddresses } from "@/lib/server-actions/checkout-actions";
import { DELIVERY_FEE, FREE_DELIVERY_FROM, deliveryFee, formatAddressLine, type Fulfillment } from "@/lib/delivery";
import {
    PickupSlot,
    formatSlot,
    fulfillmentParams,
    loadFulfillment,
    loadSlot,
    pickupDays,
    pickupHours,
    saveFulfillment,
    saveSlot,
    slotParam,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type Address = Awaited<ReturnType<typeof getMyAddresses>>[number];

function ModeCard({
    selected,
    onSelect,
    icon: Icon,
    title,
    text,
    price,
}: {
    selected: boolean;
    onSelect: () => void;
    icon: typeof Store;
    title: string;
    text: string;
    price: string;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={cn(
                "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors",
                selected ? "border-primary bg-secondary/60" : "border-border bg-white hover:border-primary/50"
            )}
        >
            <span
                className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                    selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                )}
            >
                <Icon size={22} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{title}</span>
                <span className="block text-sm text-muted-foreground">{text}</span>
            </span>
            <span className="shrink-0 text-right">
                <span className={cn("block text-sm font-black", price === "Gratuit" && "text-bio")}>{price}</span>
                <span
                    className={cn(
                        "ml-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    )}
                >
                    {selected && <Check size={14} aria-hidden />}
                </span>
            </span>
        </button>
    );
}

export default function RetraitPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const { cartProducts, totalItems, totalPrice, savings, antiGaspiDiscount } = useCartSummary();
    const { loyalty } = useLoyalty();
    const { store } = useStoreChoice();

    // Jours calculés côté navigateur (fuseau horaire du client), puis choix déjà faits repris
    const [days, setDays] = useState<ReturnType<typeof pickupDays>>([]);
    const hours = pickupHours();
    const [selectedDay, setSelectedDay] = useState("");
    const [slot, setSlot] = useState<PickupSlot | null>(null);
    const [mode, setMode] = useState<Fulfillment>("pickup");
    const [addressId, setAddressId] = useState<string | null>(null);
    const [addresses, setAddresses] = useState<Address[] | null>(null);
    // Créneaux qui ont atteint leur nombre maximal de commandes
    const [fullSlots, setFullSlots] = useState<Set<string>>(new Set());

    useEffect(() => {
        const available = pickupDays();
        const saved = loadSlot();
        const fulfillment = loadFulfillment();
        setDays(available);
        setMode(fulfillment.mode);
        setAddressId(fulfillment.addressId);
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

    useEffect(() => {
        if (!days.length) return;
        getFullSlots(days.map((day) => day.date)).then((full) => {
            setFullSlots(new Set(full));
            // Le créneau déjà retenu a pu se remplir entre-temps
            setSlot((current) => (current && full.includes(slotParam(current)) ? null : current));
        });
        // Créneaux du drive choisi : rechargés quand le client change de magasin
    }, [days, store?.slug]);

    const loadAddresses = useCallback(async () => {
        const list = await getMyAddresses();
        setAddresses(list);
        // Adresse retenue : celle déjà choisie si elle existe encore, sinon la première (livraison d'abord)
        setAddressId((current) => (current && list.some((a) => a.id === current) ? current : list[0]?.id ?? null));
    }, []);

    useEffect(() => {
        if (status === "authenticated") loadAddresses();
    }, [status, loadAddresses]);

    useEffect(() => {
        if (days.length) saveFulfillment({ mode, addressId });
    }, [mode, addressId, days.length]);

    const chooseSlot = (start: number) => {
        const next = { date: selectedDay, start };
        if (fullSlots.has(slotParam(next))) return;
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

    const delivery = mode === "delivery";
    const fee = delivery ? deliveryFee(totalPrice) : 0;
    const selectedAddress = addresses?.find((a) => a.id === addressId) ?? null;
    const selectedDayLabel = days.find((day) => day.date === selectedDay)?.label;
    const ready = !!store && !!slot && (!delivery || !!selectedAddress);

    return (
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Link href="/cart" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                    <ArrowLeft size={16} aria-hidden /> Retour au panier
                </Link>
                <CheckoutSteps current={1} />
            </div>

            <h1 className="mt-4 text-3xl font-black">Retrait ou livraison</h1>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-6">
                    <section className="flex flex-wrap items-center gap-4 rounded-3xl border bg-white p-5 md:p-6">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                            <MapPin size={22} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Votre magasin</p>
                            {store ? (
                                <>
                                    <p className="font-extrabold">{store.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {store.street}, {store.zipCode} {store.city} · Drive : {store.hours}
                                    </p>
                                </>
                            ) : (
                                <p className="font-extrabold">Choisissez le magasin qui préparera vos courses</p>
                            )}
                        </div>
                        <StoreButton variant="link" className="text-sm" />
                    </section>

                    <section className="rounded-3xl border bg-white p-5 md:p-6">
                        <h2 className="text-lg font-black">Comment souhaitez-vous recevoir vos courses ?</h2>
                        <div role="radiogroup" aria-label="Mode de réception" className="mt-4 grid gap-3">
                            <ModeCard
                                selected={!delivery}
                                onSelect={() => setMode("pickup")}
                                icon={Store}
                                title="Retrait au drive"
                                text={`${store ? `Drive ${store.name}` : "Au drive de votre magasin"} : vos courses préparées, vous les récupérez sur place.`}
                                price="Gratuit"
                            />
                            <ModeCard
                                selected={delivery}
                                onSelect={() => setMode("delivery")}
                                icon={Truck}
                                title="Livraison à domicile"
                                text={`Livrées chez vous sur le créneau choisi. Offerte dès ${formatPrice(FREE_DELIVERY_FROM)} d’articles.`}
                                price={totalPrice >= FREE_DELIVERY_FROM ? "Gratuit" : formatPrice(DELIVERY_FEE)}
                            />
                        </div>
                    </section>

                    {delivery && (
                        <section className="rounded-3xl border bg-white p-5 md:p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="flex items-center gap-2 text-lg font-black">
                                    <MapPin size={20} className="text-primary" aria-hidden />
                                    Adresse de livraison
                                </h2>
                                {userId && <AddAddressModal userId={userId} defaultType="livraison" onCreated={loadAddresses} />}
                            </div>
                            {addresses === null ? (
                                <p className="mt-4 text-sm text-muted-foreground">Chargement de vos adresses…</p>
                            ) : addresses.length === 0 ? (
                                <p className="mt-4 rounded-2xl bg-secondary p-4 text-sm">
                                    Vous n’avez pas encore d’adresse : ajoutez-en une pour être livré.
                                </p>
                            ) : (
                                <ul role="radiogroup" aria-label="Adresse de livraison" className="mt-4 grid gap-2 sm:grid-cols-2">
                                    {addresses.map((address) => {
                                        const selected = address.id === addressId;
                                        return (
                                            <li key={address.id}>
                                                <button
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={selected}
                                                    onClick={() => setAddressId(address.id)}
                                                    className={cn(
                                                        "flex h-full w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                                                        selected ? "border-primary bg-secondary/60" : "border-border bg-white hover:border-primary/50"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                                            selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                                                        )}
                                                    >
                                                        {selected && <Check size={12} aria-hidden />}
                                                    </span>
                                                    <span className="min-w-0 text-sm">
                                                        <span className="block text-xs font-bold uppercase tracking-wide text-primary">
                                                            {address.type === "livraison" ? "Livraison" : "Domicile"}
                                                        </span>
                                                        <span className="block font-semibold">{address.street}</span>
                                                        <span className="block text-muted-foreground">
                                                            {address.zipCode} {address.city}, {address.country}
                                                        </span>
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    )}

                    <section className="rounded-3xl border bg-white p-5 md:p-6">
                        <h2 className="flex items-center gap-2 text-lg font-black">
                            <CalendarDays size={20} className="text-primary" aria-hidden />
                            {delivery ? "Créneau de livraison" : "Créneau de retrait"}
                        </h2>

                        <div role="tablist" aria-label="Jour" className="-mx-1 mt-3 flex gap-2 overflow-x-auto p-1">
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
                                const full = fullSlots.has(slotParam({ date: selectedDay, start }));
                                return (
                                    <li key={start}>
                                        <button
                                            type="button"
                                            onClick={() => chooseSlot(start)}
                                            aria-pressed={active}
                                            disabled={full}
                                            className={cn(
                                                "flex h-12 w-full flex-col items-center justify-center rounded-xl border text-sm font-bold transition-colors",
                                                active
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : full
                                                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                                                      : "bg-white hover:border-primary hover:text-primary"
                                            )}
                                        >
                                            <span className={cn("flex items-center gap-1.5", full && "line-through")}>
                                                {active && <Check size={14} aria-hidden />}
                                                {start}h – {start + 1}h
                                            </span>
                                            {full && <span className="text-[11px] font-semibold">Complet</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="mt-4 text-xs text-muted-foreground">
                            {delivery
                                ? "Notre livreur vous remet vos courses pendant le créneau choisi."
                                : "Le retrait est gratuit, quel que soit le créneau."}
                        </p>
                    </section>
                </div>

                <CheckoutSummary
                    totalItems={totalItems}
                    totalPrice={totalPrice}
                    savings={savings}
                    antiGaspiDiscount={antiGaspiDiscount}
                    slotLabel={slot ? formatSlot(slot) : null}
                    pointsToEarn={loyalty ? pointsForAmount(totalPrice - antiGaspiDiscount) : null}
                    fulfillment={{ mode, fee, address: selectedAddress ? formatAddressLine(selectedAddress) : null }}
                >
                    <button
                        type="button"
                        disabled={!ready}
                        onClick={() =>
                            slot && router.push(`/cart/paiement?creneau=${slotParam(slot)}${fulfillmentParams({ mode, addressId })}`)
                        }
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Continuer vers le paiement
                        <ArrowRight size={18} aria-hidden />
                    </button>
                    {!ready && (
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                            {!store
                                ? "Choisissez votre magasin pour continuer."
                                : delivery && !selectedAddress
                                  ? "Choisissez une adresse et un créneau pour continuer."
                                  : "Choisissez un créneau pour continuer."}
                        </p>
                    )}
                </CheckoutSummary>
            </div>
        </div>
    );
}
