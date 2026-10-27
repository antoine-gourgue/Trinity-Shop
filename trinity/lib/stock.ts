import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { distanceKm, type Coordinates } from "@/lib/geo";

// Stock de chaque drive : un produit absent d'un magasin y compte comme en rupture

// Champs d'un stock renvoyés par l'API /api/stocks
export const STOCK_FIELDS = {
  id: true,
  quantity: true,
  productId: true,
  updatedAt: true,
  store: { select: { slug: true, name: true } },
} satisfies Prisma.StoreStockSelect;

// Quantités disponibles de ces produits dans un magasin
export async function storeStockMap(storeId: string, productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const stocks = await prisma.storeStock.findMany({
    where: { storeId, productId: { in: productIds } },
    select: { productId: true, quantity: true },
  });
  return new Map(stocks.map((stock) => [stock.productId, stock.quantity]));
}

// Remet en stock, dans le magasin de la commande, les articles d'une commande annulée
// (à passer dans un prisma.$transaction ; rien pour une commande sans magasin)
export function restock(storeId: string | null, items: { productId: string; quantity: number }[]) {
  if (!storeId) return [];
  return items.map((item) =>
    prisma.storeStock.updateMany({ where: { storeId, productId: item.productId }, data: { quantity: { increment: item.quantity } } })
  );
}

export interface NearbyStock {
  slug: string;
  name: string;
  city: string;
  quantity: number;
  distance: number;
}

// Magasins proches qui ont encore ce produit, quand il manque dans celui du client
export async function nearbyStock(productId: string, from: Coordinates & { id: string }, limit = 3): Promise<NearbyStock[]> {
  const stocks = await prisma.storeStock.findMany({
    where: { productId, quantity: { gt: 0 }, storeId: { not: from.id } },
    select: { quantity: true, store: { select: { slug: true, name: true, city: true, latitude: true, longitude: true } } },
  });
  return stocks
    .map(({ quantity, store }) => ({ slug: store.slug, name: store.name, city: store.city, quantity, distance: distanceKm(from, store) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
