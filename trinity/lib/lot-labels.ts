import { formatBestBefore } from "@/lib/anti-gaspi";

// Lots servis pour une ligne de commande, regroupés par date : « 2 × mercredi 12 novembre »
export function lotLines(allocations: { quantity: number; lot: { bestBefore: Date } }[]) {
  const byDate = new Map<number, number>();
  for (const allocation of allocations) {
    const day = allocation.lot.bestBefore.getTime();
    byDate.set(day, (byDate.get(day) ?? 0) + allocation.quantity);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, quantity]) => ({ quantity, bestBefore: formatBestBefore(new Date(day)) }));
}

// Date limite la plus proche des produits reçus pour une ligne, ou null avant la commande
export function nearestBestBefore(allocations: { lot: { bestBefore: Date } }[]) {
  if (allocations.length === 0) return null;
  return formatBestBefore(new Date(Math.min(...allocations.map((allocation) => allocation.lot.bestBefore.getTime()))));
}
