"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { getMyFavoriteIds, toggleFavorite, type FavoriteResult } from "@/lib/server-actions/favorite-actions";

// Favoris du client, chargés une fois et partagés par tous les cœurs de la page
const EMPTY: ReadonlySet<string> = new Set();
let favorites: ReadonlySet<string> = EMPTY;
let owner: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function load(userId: string | null) {
  if (owner === userId) return;
  owner = userId;
  favorites = userId ? new Set(await getMyFavoriteIds()) : EMPTY;
  emit();
}

export function useFavorites() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;

  // Rechargés quand le client se connecte ou se déconnecte
  useEffect(() => {
    if (status !== "loading") void load(userId);
  }, [status, userId]);

  return useSyncExternalStore(subscribe, () => favorites, () => EMPTY);
}

// Bascule optimiste : le cœur change tout de suite, puis l'état réel du serveur est appliqué
export async function switchFavorite(productId: string): Promise<FavoriteResult> {
  const before = favorites;
  const optimistic = new Set(favorites);
  if (optimistic.has(productId)) optimistic.delete(productId);
  else optimistic.add(productId);
  favorites = optimistic;
  emit();

  const result = await toggleFavorite(productId);
  const settled = new Set(before);
  if (result.ok && result.favorite) settled.add(productId);
  else if (result.ok) settled.delete(productId);
  favorites = settled;
  emit();
  return result;
}
