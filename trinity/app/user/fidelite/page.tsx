import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgePercent, Coins, History, ShoppingBasket, Smartphone } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/account";
import { formatPrice } from "@/lib/format";
import { POINTS_PER_VOUCHER, VOUCHER_VALUE } from "@/lib/loyalty";
import { AccountCard, AccountHeader } from "@/components/account/account-ui";
import LoyaltyCard from "@/components/account/loyalty-card";
import ActivateCardButton from "@/components/account/activate-card-button";

export const dynamic = "force-dynamic";

const BENEFITS = [
    { icon: Coins, title: "1 € = 1 point", text: "Chaque euro payé vous rapporte un point, automatiquement." },
    { icon: BadgePercent, title: "100 points = 5 €", text: "Transformez vos points en bons de réduction au paiement." },
    { icon: Smartphone, title: "100 % dématérialisée", text: "Votre carte est toujours dans votre espace client." },
];

export default async function FidelitePage() {
    const sessionUser = await requireUser();
    const user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: {
            firstName: true,
            lastName: true,
            loyaltyNumber: true,
            loyaltyPoints: true,
            loyaltyJoinedAt: true,
            loyaltyTransactions: { orderBy: { createdAt: "desc" }, take: 20 },
        },
    });
    if (!user) return notFound();

    if (!user.loyaltyNumber) {
        return (
            <div>
                <AccountHeader title="Ma Carte Trinity" description="Le programme de fidélité gratuit de Trinity Shop." />
                <section className="overflow-hidden rounded-3xl bg-brand-dark p-6 text-white md:p-10">
                    <p className="text-sm font-bold uppercase tracking-widest text-highlight">Gratuite et sans engagement</p>
                    <h2 className="mt-2 max-w-lg text-3xl font-black leading-tight">
                        Cumulez des points à chaque commande et économisez sur vos courses
                    </h2>
                    <ul className="mt-8 grid gap-4 md:grid-cols-3">
                        {BENEFITS.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="rounded-2xl bg-white/10 p-4">
                                <Icon size={24} className="text-highlight" aria-hidden />
                                <p className="mt-3 font-extrabold">{title}</p>
                                <p className="mt-1 text-sm text-white/75">{text}</p>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <ActivateCardButton variant="light" />
                        <Link href="/legal/loyalty-program" className="text-sm font-bold text-white/85 underline underline-offset-4 hover:text-white">
                            Lire le règlement du programme
                        </Link>
                    </div>
                </section>
            </div>
        );
    }

    const vouchers = Math.floor(user.loyaltyPoints / POINTS_PER_VOUCHER);
    const progress = user.loyaltyPoints % POINTS_PER_VOUCHER;
    const memberSince = user.loyaltyJoinedAt?.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    return (
        <div>
            <AccountHeader
                title="Ma Carte Trinity"
                description={memberSince ? `Membre du programme depuis ${memberSince}.` : undefined}
            />

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                    <LoyaltyCard number={user.loyaltyNumber} holder={`${user.firstName} ${user.lastName}`} points={user.loyaltyPoints} />
                    <p className="text-sm text-muted-foreground">
                        Vos points sont crédités automatiquement à chaque commande en ligne.
                    </p>
                </div>

                <AccountCard title="Mon solde" icon={<Coins size={18} aria-hidden />}>
                    <p className="text-4xl font-black">
                        {user.loyaltyPoints} <span className="text-lg font-bold text-muted-foreground">point{user.loyaltyPoints > 1 ? "s" : ""}</span>
                    </p>
                    <p className="mt-1 font-bold text-primary">
                        {vouchers > 0
                            ? `${vouchers} bon${vouchers > 1 ? "s" : ""} de ${formatPrice(VOUCHER_VALUE)} disponible${vouchers > 1 ? "s" : ""}, soit ${formatPrice(vouchers * VOUCHER_VALUE)}`
                            : "Aucun bon disponible pour le moment"}
                    </p>

                    <div className="mt-5">
                        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                            <span>Prochain bon de {formatPrice(VOUCHER_VALUE)}</span>
                            <span>
                                {progress} / {POINTS_PER_VOUCHER}
                            </span>
                        </div>
                        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={POINTS_PER_VOUCHER} aria-valuenow={progress}>
                            <div className="h-full rounded-full bg-highlight" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Plus que <span className="font-bold text-foreground">{POINTS_PER_VOUCHER - progress} points</span> avant votre prochain bon.
                        </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-5">
                        <Link
                            href="/"
                            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
                        >
                            <ShoppingBasket size={16} aria-hidden /> Faire mes courses
                        </Link>
                        <p className="text-xs text-muted-foreground">Vos bons s’utilisent à l’étape Paiement de la commande.</p>
                    </div>
                </AccountCard>
            </div>

            <AccountCard title="Historique de mes points" icon={<History size={18} aria-hidden />} className="mt-6">
                {user.loyaltyTransactions.length > 0 ? (
                    <ul className="divide-y">
                        {user.loyaltyTransactions.map((transaction) => (
                            <li key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold">{transaction.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {transaction.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                    </p>
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-black ${
                                        transaction.points >= 0 ? "bg-bio/10 text-bio" : "bg-promo/10 text-promo"
                                    }`}
                                >
                                    {transaction.points >= 0 ? "+" : "−"}
                                    {Math.abs(transaction.points)} pts
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-start gap-3">
                        <p className="text-sm text-muted-foreground">
                            Vos points apparaîtront ici après votre première commande avec la Carte Trinity.
                        </p>
                        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                            Commencer mes courses <ArrowRight size={16} aria-hidden />
                        </Link>
                    </div>
                )}
            </AccountCard>
        </div>
    );
}
