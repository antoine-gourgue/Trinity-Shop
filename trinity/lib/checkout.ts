// Parcours de commande : mode (retrait ou livraison), adresse et créneau, conservés le temps
// de la commande (sessionStorage) puis transmis à l'étape de paiement dans l'URL.

import type { Fulfillment } from "@/lib/delivery";

export interface PickupSlot {
  date: string; // AAAA-MM-JJ
  start: number; // heure de début, ex. 18 pour 18h-19h
}

const STORAGE_KEY = "trinity:pickup-slot";
const FULFILLMENT_KEY = "trinity:fulfillment";
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

export interface FulfillmentChoice {
  mode: Fulfillment;
  addressId: string | null;
}

export function loadFulfillment(): FulfillmentChoice {
  try {
    const raw = window.sessionStorage.getItem(FULFILLMENT_KEY);
    const choice = raw ? (JSON.parse(raw) as FulfillmentChoice) : null;
    if (choice?.mode === "delivery") return { mode: "delivery", addressId: choice.addressId ?? null };
  } catch {
    // Stockage indisponible : retrait au drive par défaut
  }
  return { mode: "pickup", addressId: null };
}

export function saveFulfillment(choice: FulfillmentChoice | null) {
  try {
    if (choice) window.sessionStorage.setItem(FULFILLMENT_KEY, JSON.stringify(choice));
    else window.sessionStorage.removeItem(FULFILLMENT_KEY);
  } catch {
    // Stockage indisponible : le choix reste en mémoire de la page
  }
}

// Mode transmis dans l'URL de l'étape de paiement : « livraison » ou rien pour le retrait
export function fulfillmentParams(choice: FulfillmentChoice) {
  return choice.mode === "delivery" && choice.addressId ? `&mode=livraison&adresse=${encodeURIComponent(choice.addressId)}` : "";
}

export function parseFulfillmentParams(mode?: string | null, addressId?: string | null): FulfillmentChoice {
  return mode === "livraison" && addressId ? { mode: "delivery", addressId } : { mode: "pickup", addressId: null };
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

const PARIS = "Europe/Paris";

// Début du créneau en date absolue, l'heure étant celle de Paris (le serveur peut tourner en UTC)
export function slotToDate(slot: PickupSlot) {
  const guess = new Date(`${slot.date}T${String(slot.start).padStart(2, "0")}:00:00Z`);
  const parisHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: PARIS, hour: "2-digit", hourCycle: "h23" }).format(guess)
  );
  return new Date(guess.getTime() - (parisHour - slot.start) * 3600_000);
}

// « Mardi 27 octobre, 18h – 19h » à partir d'un créneau enregistré
export function formatPickupDate(start: Date) {
  const day = start.toLocaleDateString("fr-FR", { timeZone: PARIS, weekday: "long", day: "numeric", month: "long" });
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: PARIS, hour: "2-digit", hourCycle: "h23" }).format(start));
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${hour}h – ${hour + 1}h`;
}
