import Link from "next/link";
import { BadgePercent, ChevronDown, ChevronRight, Coins, Smartphone } from "lucide-react";
import { POINTS_PER_VOUCHER } from "@/lib/loyalty";

const BENEFITS = [
    { icon: Coins, title: "1 € = 1 point", text: "Chaque euro payé sur vos commandes en ligne vous rapporte un point." },
    { icon: BadgePercent, title: `${POINTS_PER_VOUCHER} points = 5 €`, text: "Vos points se transforment en bons de réduction au paiement." },
    { icon: Smartphone, title: "Dématérialisée", text: "Votre carte et son code-barres sont dans votre espace client." },
];

const SECTIONS = [
    {
        title: "Qu’est-ce que la Carte Trinity ?",
        content:
            "La Carte Trinity est la carte de fidélité gratuite de Trinity Shop. Elle est dématérialisée et rattachée à votre compte client : elle possède un numéro et un code-barres, et vous permet de cumuler des points à chaque commande pour les transformer en bons de réduction.",
    },
    {
        title: "Comment adhérer au programme ?",
        content:
            "Connectez-vous à votre compte, ouvrez la rubrique « Ma Carte Trinity » de votre espace client et cliquez sur « Activer ma Carte Trinity ». L’adhésion est gratuite, sans engagement, et immédiate.",
    },
    {
        title: "Comment cumuler des points ?",
        content:
            "Chaque commande en ligne vous rapporte 1 point par euro payé, calculé sur le montant après remises. Les points sont crédités automatiquement dès la validation de la commande et apparaissent dans l’historique de votre carte.",
    },
    {
        title: "Comment utiliser mes points ?",
        content: `Par tranche de ${POINTS_PER_VOUCHER} points, vous obtenez un bon de 5 €. À l’étape Paiement de votre commande, choisissez le nombre de bons à utiliser : la remise est déduite du total, dans la limite du montant de la commande.`,
    },
    {
        title: "Mes points ont-ils une date de validité ?",
        content: "Non : vos points restent disponibles sur votre carte tant que votre compte client existe.",
    },
    {
        title: "Et si je perds ma carte ?",
        content:
            "Votre Carte Trinity est dématérialisée : elle reste toujours disponible dans votre espace client, avec votre solde et votre historique de points.",
    },
    {
        title: "Protection de vos données personnelles",
        content:
            "Les informations liées à votre carte sont utilisées uniquement pour la gestion du programme de fidélité Trinity. Conformément à la législation en vigueur, vous disposez d’un droit d’accès, de modification et de suppression de vos données.",
    },
    {
        title: "Modification des conditions du programme",
        content:
            "Trinity se réserve le droit de faire évoluer les conditions du programme de fidélité. Les adhérents en sont informés par e-mail ou via leur espace client.",
    },
];

export default function TrinityLoyaltyProgram() {
    return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
            <nav aria-label="Fil d'Ariane" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-primary hover:underline">
                    Accueil
                </Link>
                <ChevronRight size={14} aria-hidden />
                <span className="font-semibold text-foreground">Programme de fidélité</span>
            </nav>

            <section className="relative overflow-hidden rounded-3xl bg-brand-dark p-6 text-white md:p-10">
                <span className="inline-block -rotate-2 rounded-lg bg-highlight px-3 py-1 text-sm font-black text-brand-dark">
                    Carte Trinity
                </span>
                <h1 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-4xl">
                    Le programme de fidélité qui récompense vos courses
                </h1>
                <ul className="mt-8 grid gap-4 md:grid-cols-3">
                    {BENEFITS.map(({ icon: Icon, title, text }) => (
                        <li key={title} className="rounded-2xl bg-white/10 p-4">
                            <Icon size={24} className="text-highlight" aria-hidden />
                            <p className="mt-3 font-extrabold">{title}</p>
                            <p className="mt-1 text-sm text-white/75">{text}</p>
                        </li>
                    ))}
                </ul>
                <Link
                    href="/user/fidelite"
                    className="mt-8 inline-flex h-12 items-center rounded-full bg-white px-6 font-bold text-brand-dark transition-colors hover:bg-highlight"
                >
                    Activer ou voir ma carte
                </Link>
            </section>

            <h2 className="mb-4 mt-10 text-2xl font-black">Questions fréquentes</h2>
            <div className="space-y-3">
                {SECTIONS.map((section, index) => (
                    <details key={section.title} open={index === 0} className="group overflow-hidden rounded-2xl border bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold [&::-webkit-details-marker]:hidden">
                            {section.title}
                            <ChevronDown size={20} className="shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden />
                        </summary>
                        <p className="border-t px-5 py-4 leading-relaxed text-muted-foreground">{section.content}</p>
                    </details>
                ))}
            </div>
        </div>
    );
}
