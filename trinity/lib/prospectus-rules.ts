import type { OperationBanner } from "@/components/catalog/operation-banners";
import { parisDay } from "@/lib/anti-gaspi";
import { discountPercent } from "@/lib/format";

// Règles des prospectus magasin, sans accès à la base : statut, dates (heure de Paris) et prix.
// Utilisables par le formulaire du back-office comme par le serveur.

export type ProspectusStatus = "draft" | "scheduled" | "running" | "ended";

export const PROSPECTUS_STATUS_LABELS: Record<ProspectusStatus, string> = {
  draft: "Brouillon",
  scheduled: "Programmé",
  running: "En cours",
  ended: "Terminé",
};

// Durée et contenu maximum d'un prospectus
export const MAX_PROSPECTUS_DAYS = 31;
export const MAX_PROSPECTUS_ITEMS = 40;
// Remise la plus forte acceptée : au-delà, c'est presque toujours une erreur de saisie
export const MAX_PROSPECTUS_DISCOUNT = 80;

export function prospectusStatus(prospectus: { publishedAt: Date | null; startsAt: Date; endsAt: Date }, now = new Date()): ProspectusStatus {
  if (!prospectus.publishedAt) return "draft";
  if (now.getTime() >= prospectus.endsAt.getTime()) return "ended";
  return now.getTime() < prospectus.startsAt.getTime() ? "scheduled" : "running";
}

// Minuit, heure de Paris, au début du jour AAAA-MM-JJ (décalé de quelques jours si besoin)
export function parisMidnight(day: string, offsetDays = 0) {
  const [year, month, date] = day.split("-").map(Number);
  // Minuit UTC ce jour-là, puis recul du décalage de Paris à cet instant (1 h l'hiver, 2 h l'été)
  const utcMidnight = new Date(Date.UTC(year, month - 1, date + offsetDays));
  const parisHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(utcMidnight));
  return new Date(utcMidnight.getTime() - parisHour * 3_600_000);
}

// Un prospectus est saisi par son premier et son dernier jour : il court de minuit le premier jour à
// minuit après le dernier
export function prospectusPeriod(firstDay: string, lastDay: string) {
  return { startsAt: parisMidnight(firstDay), endsAt: parisMidnight(lastDay, 1) };
}

// Premier et dernier jour (AAAA-MM-JJ), pour réafficher les dates dans le formulaire
export function prospectusDays(prospectus: { startsAt: Date; endsAt: Date }) {
  return { firstDay: parisDay(prospectus.startsAt), lastDay: parisDay(new Date(prospectus.endsAt.getTime() - 1)) };
}

// Nombre de jours d'un prospectus, premier et dernier compris
export function prospectusLength(firstDay: string, lastDay: string) {
  return Math.round((Date.parse(`${lastDay}T00:00:00Z`) - Date.parse(`${firstDay}T00:00:00Z`)) / 86_400_000) + 1;
}

const shortDay = (date: Date) =>
  date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" });

// « Du mar. 27 oct. au dim. 2 nov. »
export function formatProspectusDates(prospectus: { startsAt: Date; endsAt: Date }) {
  return `Du ${shortDay(prospectus.startsAt)} au ${shortDay(new Date(prospectus.endsAt.getTime() - 1))}`;
}

// Prix promo saisi pour un produit : une vraie remise, sans dépasser la remise maximale
export function prospectusPriceError(price: number, currentPrice: number) {
  if (!Number.isInteger(price) || price <= 0) return "Prix invalide.";
  if (price >= currentPrice) return "Le prix du prospectus doit être plus bas que le prix actuel.";
  if ((discountPercent(price, currentPrice) ?? 0) > MAX_PROSPECTUS_DISCOUNT) return `Remise de plus de ${MAX_PROSPECTUS_DISCOUNT} % : vérifiez le prix.`;
  return null;
}

// « mardi 27 octobre » : premier jour d'un prospectus
export function formatProspectusFirstDay(startsAt: Date) {
  return startsAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
}

// « dimanche 2 novembre » : dernier jour d'un prospectus (sa fin est minuit le lendemain)
export function formatProspectusLastDay(endsAt: Date) {
  return new Date(endsAt.getTime() - 1).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
}

// Bannière d'un prospectus, sur l'accueil du magasin et en aperçu dans le back-office
export function prospectusBanner(
  prospectus: { id: string; title: string; endsAt: Date },
  offers: { id: string; name: string; picture: string; percent: number }[]
): OperationBanner {
  const best = Math.max(0, ...offers.map((offer) => offer.percent));
  return {
    href: `/prospectus/${prospectus.id}`,
    tone: "promo",
    kicker: prospectus.title,
    title: `Jusqu'à −${best} %`,
    text: `${offers.length} produit${offers.length > 1 ? "s" : ""} à prix promo jusqu'au ${formatProspectusLastDay(prospectus.endsAt)}`,
    cta: "J'en profite",
    visual: { kind: "products", products: [...offers].sort((a, b) => b.percent - a.percent).slice(0, 3) },
  };
}
