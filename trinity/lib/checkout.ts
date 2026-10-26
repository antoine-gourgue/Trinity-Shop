// Parcours de commande : créneau de retrait au drive, conservé le temps de la commande
// (sessionStorage) puis rappelé sur la confirmation.

export interface PickupSlot {
  date: string; // AAAA-MM-JJ
  start: number; // heure de début, ex. 18 pour 18h-19h
}

const STORAGE_KEY = "trinity:pickup-slot";
const OPENING_HOURS = [9, 10, 11, 12, 14, 15, 16, 17, 18, 19];
const DAYS_AHEAD = 6;

function toIsoDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

// Jours proposés : à partir de demain, sans les dimanches
export function pickupDays(from = new Date()) {
  const days: { date: string; label: string; weekday: string; day: string }[] = [];
  const cursor = new Date(from);
  while (days.length < DAYS_AHEAD) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0) continue;
    days.push({
      date: toIsoDate(cursor),
      label: cursor.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
      weekday: cursor.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      day: cursor.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", ""),
    });
  }
  return days;
}

export function pickupHours() {
  return OPENING_HOURS;
}

export function formatSlot(slot: PickupSlot) {
  const date = new Date(`${slot.date}T12:00:00`);
  const day = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${slot.start}h – ${slot.start + 1}h`;
}

export function loadSlot(): PickupSlot | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const slot = raw ? (JSON.parse(raw) as PickupSlot) : null;
    // Un créneau passé (onglet resté ouvert plusieurs jours) n'est plus valable
    return slot && slot.date > toIsoDate(new Date()) ? slot : null;
  } catch {
    return null;
  }
}

export function saveSlot(slot: PickupSlot | null) {
  try {
    if (slot) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slot));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : le créneau reste en mémoire de la page
  }
}

// Créneau transmis d'une étape à l'autre dans l'URL : « 2026-10-28_18 »
export function slotParam(slot: PickupSlot) {
  return `${slot.date}_${slot.start}`;
}

export function parseSlotParam(value?: string | null): PickupSlot | null {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})_(\d{1,2})$/);
  if (!match) return null;
  const start = Number.parseInt(match[2], 10);
  return OPENING_HOURS.includes(start) ? { date: match[1], start } : null;
}
