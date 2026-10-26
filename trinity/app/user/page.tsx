import Link from "next/link";
import { ArrowRight, MapPin, Package, ShoppingBasket } from "lucide-react";
import prisma from "@/lib/prisma";
import { accountLinks, requireUser } from "@/lib/account";
import OrderCard from "@/components/account/order-card";
import { AccountCard } from "@/components/account/account-ui";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const MORE_OPTIONS = [
    {
        title: "Mes communications",
        links: [
            { href: "/legal/maintenance", label: "Mes canaux de communication" },
            { href: "/legal/maintenance", label: "Mes préférences" },
        ],
    },
    {
        title: "Réglementation",
        links: [
            { href: "/legal/privacy-policy", label: "Politique des fichiers" },
            { href: "/legal/loyalty-program", label: "Conditions d’utilisation et de vente" },
            { href: "/legal/mention-legal", label: "Mentions légales" },
            { href: "/legal/cookie", label: "Cookies" },
        ],
    },
    {
        title: "Aide et contact",
        links: [
            { href: "/legal/faq", label: "Questions fréquentes" },
            { href: "/legal/contact", label: "Contactez-nous" },
        ],
    },
];

export default async function UserPage() {
    const sessionUser = await requireUser();
    const links = accountLinks(sessionUser.id);

    const [user, lastOrder, activeCart] = await Promise.all([
        prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: {
                firstName: true,
                createdAt: true,
                _count: { select: { orders: true, addresses: true } },
            },
        }),
        prisma.order.findFirst({
            where: { userId: sessionUser.id },
            orderBy: { createdAt: "desc" },
            include: { cart: { include: { productsInCart: { include: { product: true } } } } },
        }),
        prisma.cart.findFirst({
            where: { userId: sessionUser.id, archived: false },
            select: { productsInCart: { select: { quantity: true } } },
        }),
    ]);

    const cartItems = activeCart?.productsInCart.reduce((acc, item) => acc + item.quantity, 0) ?? 0;
    const memberSince = user?.createdAt.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    const tiles = [
        {
            href: links.orders,
            icon: Package,
            label: "Mes commandes",
            value: `${user?._count.orders ?? 0} commande${(user?._count.orders ?? 0) > 1 ? "s" : ""}`,
        },
        {
            href: "/cart",
            icon: ShoppingBasket,
            label: "Mon panier",
            value: `${cartItems} article${cartItems > 1 ? "s" : ""}`,
        },
        {
            href: links.addresses,
            icon: MapPin,
            label: "Mes adresses",
            value: `${user?._count.addresses ?? 0} enregistrée${(user?._count.addresses ?? 0) > 1 ? "s" : ""}`,
        },
    ];

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl bg-brand-dark p-6 text-white md:p-8">
                <p className="text-sm font-bold uppercase tracking-widest text-highlight">Mon espace</p>
                <h1 className="mt-2 text-3xl font-black">Bonjour {user?.firstName ?? sessionUser.firstName} !</h1>
                {memberSince && <p className="mt-1 text-white/75">Client Trinity depuis {memberSince}.</p>}
            </section>

            <ul className="grid gap-4 sm:grid-cols-3">
                {tiles.map(({ href, icon: Icon, label, value }) => (
                    <li key={label}>
                        <Link
                            href={href}
                            className="group flex items-center gap-4 rounded-3xl border bg-white p-5 transition-shadow hover:shadow-lg"
                        >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <Icon size={22} aria-hidden />
                            </span>
                            <span>
                                <span className="block font-extrabold">{label}</span>
                                <span className="block text-sm text-muted-foreground">{value}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>

            <section>
                <div className="mb-3 flex items-end justify-between gap-4">
                    <h2 className="text-xl font-black">Ma dernière commande</h2>
                    {lastOrder && (
                        <Link href={links.orders} className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                            Toutes mes commandes <ArrowRight size={16} aria-hidden />
                        </Link>
                    )}
                </div>
                {lastOrder ? (
                    <OrderCard href={`/user/${sessionUser.id}/order/${lastOrder.id}`} order={lastOrder} />
                ) : (
                    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-white px-6 py-10 text-center">
                        <Package size={36} className="text-muted-foreground/60" aria-hidden />
                        <p className="font-extrabold">Vous n’avez pas encore passé de commande</p>
                        <Button asChild className="rounded-full px-6 font-bold">
                            <Link href="/">Commencer mes courses</Link>
                        </Button>
                    </div>
                )}
            </section>

            <section>
                <h2 className="mb-3 text-xl font-black">Plus d’options</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {MORE_OPTIONS.map((group) => (
                        <AccountCard key={group.title} title={group.title}>
                            <ul className="space-y-2">
                                {group.links.map((link) => (
                                    <li key={link.label}>
                                        <Link href={link.href} className="text-sm text-primary hover:underline">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </AccountCard>
                    ))}
                </div>
            </section>
        </div>
    );
}
