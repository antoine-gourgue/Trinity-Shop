// Anti-gaspillage : à l'approche de sa date limite, un lot du stock passe en vente en ligne à prix
// réduit, et la remise grandit jusqu'à la veille. Fonctions pures, partagées par le rayon
// anti-gaspi, le panier, le paiement, la commande et le back-office.

// Remise selon le nombre de jours avant la date limite (au jour près, heure de Paris)
const MARKDOWNS: { days: number; percent: number }[] = [
  { days: 1, percent: 50 },
  { days: 2, percent: 40 },
  { days: 3, percent: 30 },
  { days: 5, percent: 20 },
];

// Un lot passe en vente anti-gaspi au plus 5 jours avant sa date limite (moins pour un produit qui
// se conserve peu : voir markdownWindow)
export const ANTI_GASPI_WINDOW = MARKDOWNS[MARKDOWNS.length - 1].days;

const DAY = 86_400_000;

// Jour calendaire à Paris (AAAA-MM-JJ)
export function parisDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

// Date limite d'un lot (colonne date sans heure, lue à minuit UTC)
export function lotDay(bestBefore: Date) {
  return bestBefore.toISOString().slice(0, 10);
}

// Date limite saisie (AAAA-MM-JJ), à enregistrer dans la colonne date
export function bestBeforeFromDay(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

function dayNumber(day: string) {
  return Date.parse(`${day}T00:00:00Z`) / DAY;
}

// Jours restants avant la date limite : 0 le jour même, négatif une fois dépassée
export function daysLeft(bestBefore: Date, now = new Date()) {
  return dayNumber(lotDay(bestBefore)) - dayNumber(parisDay(now));
}

// Remise en pourcentage, ou null hors de la période anti-gaspi du lot (trop tôt, ou date du jour
// dépassée : le premier créneau de retrait est le lendemain)
export function markdownPercent(days: number, window = ANTI_GASPI_WINDOW) {
  if (days < 1 || days > window) return null;
  return MARKDOWNS.find((markdown) => days <= markdown.days)?.percent ?? null;
}

// Remise par unité, arrondie au centime (prix en millièmes d'euro)
export function unitDiscount(price: number, percent: number) {
  return Math.round((price * percent) / 1000) * 10;
}

export interface LotOffer {
  id: string;
  storeId: string;
  quantity: number;
  bestBefore: Date;
  closedAt: Date | null;
  // Jours avant la date où le lot passe en anti-gaspi
  markdownDays: number;
}

// Prix anti-gaspi d'un lot aujourd'hui, ou null s'il n'est pas (ou plus) en vente
export function lotPricing(lot: Pick<LotOffer, "quantity" | "bestBefore" | "closedAt" | "markdownDays">, price: number, now = new Date()) {
  if (lot.closedAt || lot.quantity <= 0) return null;
  const days = daysLeft(lot.bestBefore, now);
  const percent = markdownPercent(days, lot.markdownDays);
  if (percent === null) return null;
  const discount = unitDiscount(price, percent);
  return { percent, days, unitDiscount: discount, unitPrice: price - discount };
}

// Le lot est encore bon le jour du retrait (ou de la livraison)
export function validAtPickup(bestBefore: Date, pickupSlot: Date | null) {
  return !pickupSlot || lotDay(bestBefore) >= parisDay(pickupSlot);
}

export interface AntiGaspiCartLine {
  productId: string;
  quantity: number;
  price: number;
  lot: LotOffer | null;
}

export interface AntiGaspiAllocation {
  productId: string;
  lotId: string;
  units: number;
  percent: number;
  discount: number;
}

// Unités servies à prix anti-gaspi pour chaque ligne qui a choisi l'offre : celles du lot, dans la
// limite de la quantité commandée, si le lot appartient au magasin et reste bon au retrait
export function allocateAntiGaspi(lines: AntiGaspiCartLine[], storeId: string | null, pickupSlot: Date | null, now = new Date()) {
  const allocations: AntiGaspiAllocation[] = [];
  for (const line of lines) {
    const { lot } = line;
    if (!lot || !storeId || lot.storeId !== storeId || !validAtPickup(lot.bestBefore, pickupSlot)) continue;
    const pricing = lotPricing(lot, line.price, now);
    if (!pricing) continue;
    const units = Math.min(line.quantity, lot.quantity);
    allocations.push({ productId: line.productId, lotId: lot.id, units, percent: pricing.percent, discount: units * pricing.unitDiscount });
  }
  return { allocations, discount: allocations.reduce((total, allocation) => total + allocation.discount, 0) };
}

// Où en est un lot ouvert : périmé (retiré de la vente, à jeter), dernier jour (à donner),
// en vente anti-gaspi, ou encore en rayon au prix normal
export type LotStage = "expired" | "last-day" | "on-sale" | "in-stock";

export function lotStage(lot: { bestBefore: Date; markdownDays: number; withdrawnAt: Date | null }, now = new Date()): LotStage {
  const days = daysLeft(lot.bestBefore, now);
  if (lot.withdrawnAt || days < 0) return "expired";
  if (days === 0) return "last-day";
  return markdownPercent(days, lot.markdownDays) === null ? "in-stock" : "on-sale";
}

// « à consommer jusqu'au mercredi 29 octobre »
// « mardi 23 octobre », avec l'année quand elle n'est pas l'année en cours (produits qui se gardent
// longtemps : « mardi 23 octobre 2029 »)
export function formatBestBefore(bestBefore: Date, now = new Date()) {
  const otherYear = bestBefore.getUTCFullYear() !== Number(parisDay(now).slice(0, 4));
  return bestBefore.toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(otherYear && { year: "numeric" }),
  });
}

// Échéance lisible : « aujourd'hui », « demain », « dans 3 jours », « dépassée »
export function daysLeftLabel(days: number) {
  if (days < 0) return "date dépassée";
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} jours`;
}
