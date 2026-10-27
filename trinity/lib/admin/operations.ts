// Indicateurs opérationnels du back-office : préparation, drive, créneaux et anti-gaspi.
// Fonctions pures, calculées à partir des commandes lues par getOperations.

const MINUTE = 60_000;

export interface PreparedOrder {
  preparationStartedAt: Date | null;
  preparedAt: Date | null;
  pickupSlot: Date | null;
  preparationRefund: number;
  lines: { quantity: number; preparedQuantity: number | null; substituteId: string | null; allowSubstitute: boolean }[];
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

// Préparation : durée moyenne (en minutes), commandes prêtes avant le début de leur créneau,
// articles manquants et part de ces manques compensée par un remplaçant
export function preparationStats(orders: PreparedOrder[]) {
  const durations = orders
    .filter((order) => order.preparationStartedAt && order.preparedAt)
    .map((order) => (order.preparedAt!.getTime() - order.preparationStartedAt!.getTime()) / MINUTE)
    // Une préparation laissée ouverte toute une nuit fausserait la moyenne
    .filter((minutes) => minutes >= 0 && minutes <= 8 * 60);
  const withSlot = orders.filter((order) => order.preparedAt && order.pickupSlot);
  const onTime = withSlot.filter((order) => order.preparedAt!.getTime() <= order.pickupSlot!.getTime()).length;

  let ordered = 0;
  let missing = 0;
  let substituted = 0;
  for (const order of orders) {
    for (const line of order.lines) {
      // Lignes passées par l'écran de préparation seulement
      if (line.preparedQuantity === null) continue;
      const lineMissing = Math.max(0, line.quantity - line.preparedQuantity);
      ordered += line.quantity;
      missing += lineMissing;
      if (line.substituteId && line.allowSubstitute) substituted += lineMissing;
    }
  }

  const minutes = average(durations);
  return {
    prepared: orders.length,
    averageMinutes: minutes === null ? null : Math.round(minutes),
    onTimeRate: withSlot.length ? onTime / withSlot.length : null,
    missingRate: ordered ? missing / ordered : null,
    substitutionRate: missing ? substituted / missing : null,
    refunded: orders.reduce((total, order) => total + order.preparationRefund, 0),
  };
}

// Attente moyenne au drive (en minutes), entre « Je suis arrivé » et la remise des courses
export function driveWait(orders: { arrivedAt: Date | null; completedAt: Date | null }[]) {
  const waits = orders
    .filter((order) => order.arrivedAt && order.completedAt)
    .map((order) => (order.completedAt!.getTime() - order.arrivedAt!.getTime()) / MINUTE)
    .filter((minutes) => minutes >= 0 && minutes <= 4 * 60);
  const minutes = average(waits);
  return { handedOver: waits.length, averageMinutes: minutes === null ? null : Math.round(minutes * 10) / 10 };
}

// Jour (AAAA-MM-JJ) et heure d'un créneau, à Paris
export function parisSlotKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}_${Number(part("hour"))}`;
}

// Jours ouverts à venir, aujourd'hui compris (le drive est fermé le dimanche)
export function upcomingDays(now: Date, count: number) {
  const days: { date: string; label: string }[] = [];
  for (let offset = 0; days.length < count && offset < count + 2; offset++) {
    const day = new Date(now.getTime() + offset * 86_400_000);
    const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(day);
    if (weekday === "Sun") continue;
    days.push({
      date: parisSlotKey(day).slice(0, 10),
      label: day.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric" }).replace(".", ""),
    });
  }
  return days;
}

// Charge de chaque créneau : commandes réservées sur la capacité (une ligne par jour, une colonne par heure)
export function slotLoad(
  booked: { pickupSlot: Date | null; count: number }[],
  days: { date: string; label: string }[],
  hours: number[],
  capacity: number
) {
  const counts = new Map<string, number>();
  for (const { pickupSlot, count } of booked) {
    if (!pickupSlot) continue;
    const key = parisSlotKey(pickupSlot);
    counts.set(key, (counts.get(key) ?? 0) + count);
  }
  return days.map((day) => ({
    ...day,
    slots: hours.map((hour) => {
      const count = counts.get(`${day.date}_${hour}`) ?? 0;
      return { hour, count, rate: capacity ? Math.min(1, count / capacity) : 0 };
    }),
  }));
}

// Lots anti-gaspi : unités vendues en ligne ou données (sauvées) et unités jetées
export function antiGaspiOutcome(totals: { sold: number; donated: number; wasted: number }) {
  const saved = totals.sold + totals.donated;
  const handled = saved + totals.wasted;
  return { ...totals, saved, rescueRate: handled ? saved / handled : null };
}

// « 87 % », ou un tiret sans données
export function formatRate(rate: number | null) {
  return rate === null ? "—" : `${Math.round(rate * 100)} %`;
}

// « 14 min », « 1 h 05 », ou un tiret sans données
export function formatMinutes(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(Math.round(minutes % 60)).padStart(2, "0")}`;
}
