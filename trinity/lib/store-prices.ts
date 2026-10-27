import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

// Prix des prospectus magasin : pendant ses dates, un prospectus publié fixe le prix de ses produits
// pour les clients du magasin. Ce prix ne s'applique que s'il est plus bas que le prix du moment (une
// promotion nationale plus forte reste la meilleure) ; l'ancien prix devient alors le prix barré.

export interface StorePromotion {
  price: number;
  // Fin du prospectus (exclusive), annoncée comme la fin d'une promotion
  endsAt: Date;
  prospectusId: string;
}

// Prospectus d'un magasin en cours : publiés, commencés et pas encore terminés
export function runningProspectusWhere(storeId: string, now = new Date()) {
  return { storeId, publishedAt: { not: null }, startsAt: { lte: now }, endsAt: { gt: now } } satisfies Prisma.ProspectusWhereInput;
}

// Prix promo du magasin pour ces produits ; un produit présent dans deux prospectus prend le plus bas
export async function storePromotions(storeId: string | null | undefined, productIds: string[], now = new Date()) {
  const promotions = new Map<string, StorePromotion>();
  if (!storeId || productIds.length === 0) return promotions;
  const items = await prisma.prospectusItem.findMany({
    where: { productId: { in: [...new Set(productIds)] }, prospectus: runningProspectusWhere(storeId, now) },
    select: { productId: true, price: true, prospectus: { select: { id: true, endsAt: true } } },
  });
  for (const item of items) {
    const current = promotions.get(item.productId);
    if (!current || item.price < current.price) {
      promotions.set(item.productId, { price: item.price, endsAt: item.prospectus.endsAt, prospectusId: item.prospectus.id });
    }
  }
  return promotions;
}

interface Priced {
  price: number;
  regularPrice?: number | null;
  promoEndsAt?: Date | null;
}

// Produit au prix du magasin : le prix du prospectus s'il est plus bas, avec l'ancien prix barré
export function applyStorePromotion<T extends Priced>(product: T, promotion: StorePromotion | undefined): T {
  if (!promotion || promotion.price >= product.price) return product;
  return { ...product, price: promotion.price, regularPrice: product.regularPrice ?? product.price, promoEndsAt: promotion.endsAt };
}

// Liste de produits (cartes, fiches) au prix du magasin du client
export async function withStorePrices<T extends Priced & { id: string }>(products: T[], storeId: string | null | undefined, now = new Date()) {
  const promotions = await storePromotions(storeId, products.map((product) => product.id), now);
  if (promotions.size === 0) return products;
  return products.map((product) => applyStorePromotion(product, promotions.get(product.id)));
}

// Lignes d'un panier au prix du magasin : le prix de chaque produit est celui que le client paiera
export async function withStoreLinePrices<T extends { productId: string; product: Priced }>(
  lines: T[],
  storeId: string | null | undefined,
  now = new Date()
): Promise<T[]> {
  const promotions = await storePromotions(storeId, lines.map((line) => line.productId), now);
  if (promotions.size === 0) return lines;
  return lines.map((line) => ({ ...line, product: applyStorePromotion(line.product, promotions.get(line.productId)) }));
}
