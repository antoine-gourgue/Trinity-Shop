// Réassort d'un magasin : quantité à commander et date de livraison. Fonctions pures, partagées par
// le back-office et le réassort automatique de la nuit.

// Sous ce stock, un produit est à recommander (même seuil que le « stock faible » du back-office)
export const REORDER_POINT = 20;
// Stock visé après livraison, au minimum
export const REORDER_TARGET = 80;
// Ventes prises en compte pour la suggestion, et jours de ventes à couvrir
const SALES_DAYS = 14;
const COVERED_DAYS = 14;

// Quantité suggérée : de quoi tenir deux semaines au rythme des ventes récentes, et au moins
// remonter au stock visé
export function suggestedQuantity(stock: number, soldLastTwoWeeks: number) {
  const target = Math.max(REORDER_TARGET, Math.ceil((soldLastTwoWeeks / SALES_DAYS) * COVERED_DAYS));
  return Math.max(0, target - stock);
}

// Livraison le lendemain à 7 h (heure de Paris), sauf le dimanche : elle arrive alors le lundi
export function expectedDelivery(now = new Date()) {
  let day = new Date(now.getTime() + 86_400_000);
  if (new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(day) === "Sun") {
    day = new Date(day.getTime() + 86_400_000);
  }
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(day);
  // 7 h à Paris : 6 h UTC l'hiver, 5 h UTC l'été
  const utcGuess = new Date(`${date}T07:00:00Z`);
  const parisHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(utcGuess));
  return new Date(utcGuess.getTime() - (parisHour - 7) * 3_600_000);
}

// « demain 7 h », « lundi 3 novembre, 7 h »
export function formatDelivery(expectedAt: Date) {
  return expectedAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
}
