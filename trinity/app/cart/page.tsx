"use client";

import { useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    ArrowRight,
    Loader2,
    Minus,
    Plus,
    ShoppingBasket,
    Store,
    Trash2,
    UserRound,
} from "lucide-react";
import { useCart } from "@/app/contexts/CartContext";
import { discountPercent, formatBrand, formatPrice } from "@/lib/format";
import { formatUnitPrice } from "@/lib/product-info";
import { RAYONS } from "@/lib/rayons";
import Price from "@/components/product/price";
import ProductImage from "@/components/product/product-image";
import ProductCard from "@/components/product/productCard";
import ProductCarousel from "@/components/catalog/product-carousel";
import CheckoutSteps from "@/components/cart/checkout-steps";
import CheckoutSummary from "@/components/cart/checkout-summary";
import { useCartSummary } from "@/components/cart/use-cart-summary";
import { Button } from "@/components/ui/button";

const OTHER_GROUP = { slug: "autres", name: "Autres produits", image: null as string | null };

export default function CartPage() {
    const { removeProduct, handleUpdateProductQuantity, refreshCart } = useCart();
    const { cartProducts, details, suggestions, totalItems, totalPrice, savings } = useCartSummary();
    const { data: session, status } = useSession();
    const [isPending, startTransition] = useTransition();

    // Articles regroupés par rayon, dans l'ordre des rayons du magasin
    const groups = useMemo(() => {
        const sections = [...RAYONS, OTHER_GROUP].map((rayon) => ({
            slug: rayon.slug,
            name: rayon.name,
            image: rayon.image,
            items: cartProducts.filter((p) => (details[p.id]?.rayonSlug ?? "autres") === rayon.slug),
        }));
        return sections.filter((section) => section.items.length > 0);
    }, [cartProducts, details]);

    const handleClearCart = () => {
        startTransition(async () => {
            for (const product of cartProducts) {
                await removeProduct(product.id);
            }
            await refreshCart();
        });
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
                <Button asChild size="lg" variant="outline" className="rounded-full px-6 font-bold">
                    <Link href="/produits?promo=1">Voir les promos</Link>
                </Button>
            </EmptyState>
        );
    }

    const validateButton = (className?: string) => (
        <Link
            href="/cart/retrait"
            className={`flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-brand-dark ${className ?? ""}`}
        >
            Valider mon panier
            <ArrowRight size={18} aria-hidden />
        </Link>
    );

    return (
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-28 md:px-6 lg:pb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                    <ArrowLeft size={16} aria-hidden /> Continuer mes courses
                </Link>
                <CheckoutSteps current={0} />
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <h1 className="text-3xl font-black">
                    Mon panier{" "}
                    <span className="text-lg font-bold text-muted-foreground">
                        ({totalItems} article{totalItems > 1 ? "s" : ""})
                    </span>
                </h1>
                <button
                    type="button"
                    onClick={handleClearCart}
                    disabled={isPending}
                    className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-destructive"
                >
                    <Trash2 size={14} aria-hidden /> Vider le panier
                </button>
            </div>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-4">
                    <div className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm">
                        <Store size={20} className="shrink-0 text-primary" aria-hidden />
                        <p>
                            <span className="font-bold">Retrait au drive Trinity U Rennes Epitech</span>
                            <span className="text-muted-foreground"> · préparation de la commande offerte</span>
                        </p>
                    </div>

                    {groups.map((group) => {
                        const groupCount = group.items.reduce((acc, item) => acc + item.quantity, 0);
                        const groupTotal = group.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
                        return (
                            <section key={group.slug} aria-label={group.name} className="overflow-hidden rounded-3xl border bg-white">
                                <header className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3 sm:px-5">
                                    <h2 className="flex items-center gap-3 font-extrabold">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                                            {group.image ? (
                                                <Image src={group.image} alt="" width={24} height={24} className="h-6 w-auto object-contain" />
                                            ) : (
                                                <ShoppingBasket size={18} className="text-primary" aria-hidden />
                                            )}
                                        </span>
                                        {group.name}
                                        <span className="text-sm font-semibold text-muted-foreground">({groupCount})</span>
                                    </h2>
                                    <span className="text-sm font-bold text-muted-foreground">{formatPrice(groupTotal)}</span>
                                </header>

                                <ul className="divide-y">
                                    {group.items.map((product) => {
                                        const info = details[product.id];
                                        const discount = discountPercent(product.price, info?.regularPrice);
                                        const unitPrice = formatUnitPrice(product.price, info?.netContent);
                                        return (
                                            <li
                                                key={product.id}
                                                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 sm:flex sm:p-5"
                                            >
                                                <Link
                                                    href={`/product/${product.id}`}
                                                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-white sm:h-24 sm:w-24"
                                                >
                                                    <ProductImage src={product.picture} alt={product.name} sizes="96px" className="p-1.5" />
                                                    {discount && (
                                                        <span className="absolute left-0 top-0 rounded-br-lg bg-promo px-1.5 py-0.5 text-[10px] font-black text-white">
                                                            -{discount} %
                                                        </span>
                                                    )}
                                                </Link>

                                                    <div className="min-w-0 sm:flex-1">
                                                        {info?.brand && (
                                                            <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">
                                                                {formatBrand(info.brand)}
                                                            </p>
                                                        )}
                                                        <Link href={`/product/${product.id}`} className="line-clamp-2 font-bold leading-snug hover:underline">
                                                            {product.name}
                                                        </Link>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {[info?.netContent, unitPrice].filter(Boolean).join(" · ") || `${formatPrice(product.price)} l’unité`}
                                                        </p>
                                                    </div>

                                                    <div className="col-span-2 flex items-center justify-between gap-4 sm:justify-end">
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

                                                        <div className="w-24 text-right">
                                                            {discount && info?.regularPrice && (
                                                                <p className="text-xs text-muted-foreground line-through">
                                                                    {formatPrice(info.regularPrice * product.quantity)}
                                                                </p>
                                                            )}
                                                            <p className={`text-lg font-black tabular-nums ${discount ? "text-promo" : ""}`}>
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
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        );
                    })}
                </div>

                <CheckoutSummary totalItems={totalItems} totalPrice={totalPrice} savings={savings}>
                    {validateButton("w-full")}
                </CheckoutSummary>
            </div>

            {suggestions.length > 0 && (
                <section className="mt-12">
                    <h2 className="mb-4 text-xl font-black md:text-2xl">Vous avez oublié ?</h2>
                    <ProductCarousel label="Vous avez oublié ?">
                        {suggestions.map((product) => (
                            <li key={product.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%] xl:w-[19%]">
                                <ProductCard
                                    id={product.id}
                                    name={product.name}
                                    price={product.price}
                                    regularPrice={product.regularPrice}
                                    netContent={product.netContent}
                                    picture={product.picture}
                                    nutriScore={product.nutriScore ?? undefined}
                                    brand={product.brand}
                                />
                            </li>
                        ))}
                    </ProductCarousel>
                </section>
            )}

            {/* Sur mobile, le total et le paiement restent accessibles au-dessus de la barre d'onglets */}
            <div className="fixed inset-x-0 bottom-[68px] z-40 border-t bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs text-muted-foreground">Total ({totalItems} art.)</p>
                        <Price value={totalPrice} size="md" />
                    </div>
                    {validateButton("flex-1 max-w-[230px]")}
                </div>
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
