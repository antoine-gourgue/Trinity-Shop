import prisma from "@/lib/prisma";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import { allocateAntiGaspi, ANTI_GASPI_WINDOW, bestBeforeFromDay, lotPricing, parisDay } from "@/lib/anti-gaspi";

// Offres anti-gaspi lues en base : rayon du magasin, fiche produit et panier du client

const DAY = 86_400_000;

// Lots ouverts d'un magasin dont la date limite tombe entre demain et la fin de la période anti-gaspi
function onSaleWhere(storeId: string, now: Date) {
  const today = bestBeforeFromDay(parisDay(now));
  return {
    storeId,
    closedAt: null,
    quantity: { gt: 0 },
    bestBefore: { gte: new Date(today.getTime() + DAY), lte: new Date(today.getTime() + ANTI_GASPI_WINDOW * DAY) },
    product: VISIBLE_PRODUCT,
  };
}

const OFFER_PRODUCT = {
  id: true,
  name: true,
  price: true,
  regularPrice: true,
  netContent: true,
  picture: true,
  nutriScore: true,
  brand: { select: { name: true } },
} as const;

export interface AntiGaspiOffer {
  lotId: string;
  quantity: number;
  bestBefore: Date;
  days: number;
  percent: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    price: number;
    regularPrice: number | null;
    netContent: string | null;
    picture: string;
    nutriScore: string | null;
    brand: string;
  };
}

// Offres du magasin, les dates les plus proches d'abord (un produit n'apparaît qu'une fois)
export async function storeOffers(storeId: string, now = new Date(), take?: number): Promise<AntiGaspiOffer[]> {
  const lots = await prisma.antiGaspiLot.findMany({
    where: onSaleWhere(storeId, now),
    orderBy: [{ bestBefore: "asc" }, { createdAt: "asc" }],
    select: { id: true, storeId: true, quantity: true, bestBefore: true, closedAt: true, product: { select: OFFER_PRODUCT } },
  });

  const seen = new Set<string>();
  const offers: AntiGaspiOffer[] = [];
  for (const { product, ...lot } of lots) {
    const pricing = lotPricing(lot, product.price, now);
    if (!pricing || seen.has(product.id)) continue;
    seen.add(product.id);
    offers.push({
      lotId: lot.id,
      quantity: lot.quantity,
      bestBefore: lot.bestBefore,
      days: pricing.days,
      percent: pricing.percent,
      unitPrice: pricing.unitPrice,
      product: { ...product, brand: product.brand.name },
    });
  }
  return take ? offers.slice(0, take) : offers;
}

// Offre d'un produit dans le magasin, pour sa fiche
export async function productOffer(storeId: string, productId: string, now = new Date()) {
  const [offer] = (await storeOffers(storeId, now)).filter((candidate) => candidate.product.id === productId);
  return offer ?? null;
}

// Remise anti-gaspi du panier actif : lignes qui ont choisi l'offre, magasin et créneau de retrait
export async function cartAntiGaspi(userId: string, storeId: string | null, pickupSlot: Date | null, now = new Date()) {
  const lines = await prisma.productInCart.findMany({
    where: { cart: { userId, archived: false }, antiGaspiLotId: { not: null } },
    select: {
      productId: true,
      quantity: true,
      product: { select: { price: true } },
      antiGaspiLot: { select: { id: true, storeId: true, quantity: true, bestBefore: true, closedAt: true } },
    },
  });
  return allocateAntiGaspi(
    lines.map((line) => ({ productId: line.productId, quantity: line.quantity, price: line.product.price, lot: line.antiGaspiLot })),
    storeId,
    pickupSlot,
    now
  );
}
