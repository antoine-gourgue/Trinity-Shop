import prisma from "@/lib/prisma";
import { VISIBLE_PRODUCT } from "@/lib/catalog";
import { discountPercent } from "@/lib/format";
import { runningProspectusWhere } from "@/lib/store-prices";

// Lecture des prospectus magasin : back-office, accueil et page du prospectus

const ITEM_PRODUCT = {
  id: true,
  name: true,
  picture: true,
  price: true,
  regularPrice: true,
  netContent: true,
  nutriScore: true,
  promoEndsAt: true,
  brand: { select: { name: true } },
} as const;

type ItemRow = {
  price: number;
  product: {
    id: string;
    name: string;
    picture: string;
    price: number;
    regularPrice: number | null;
    netContent: string | null;
    nutriScore: string | null;
    promoEndsAt: Date | null;
    brand: { name: string };
  };
};

export interface ProspectusOffer {
  id: string;
  name: string;
  picture: string;
  brand: string;
  netContent: string | null;
  nutriScore: string | null;
  // Prix du prospectus, et prix barré : le prix habituel (hors promotion nationale)
  price: number;
  regularPrice: number;
  percent: number;
  promoEndsAt: Date;
  // Prix du catalogue, là où le prospectus ne s'applique pas (autre magasin, pas encore commencé)
  catalog: { price: number; regularPrice: number | null; promoEndsAt: Date | null };
}

// Produits d'un prospectus à leur prix promo, les plus fortes remises d'abord. Un produit dont le prix
// actuel est déjà plus bas (promotion nationale plus forte) n'y figure pas.
function offers(items: ItemRow[], endsAt: Date): ProspectusOffer[] {
  return items
    .filter((item) => item.price < item.product.price)
    .map(({ price, product }) => {
      const regularPrice = product.regularPrice ?? product.price;
      return {
        id: product.id,
        name: product.name,
        picture: product.picture,
        brand: product.brand.name,
        netContent: product.netContent,
        nutriScore: product.nutriScore,
        price,
        regularPrice,
        percent: discountPercent(price, regularPrice) ?? 0,
        promoEndsAt: endsAt,
        catalog: { price: product.price, regularPrice: product.regularPrice, promoEndsAt: product.promoEndsAt },
      };
    })
    .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, "fr"));
}

// Prospectus en cours d'un magasin (le plus récent s'il y en a plusieurs), pour l'accueil
export async function runningProspectus(storeId: string, now = new Date()) {
  const prospectus = await prisma.prospectus.findFirst({
    where: runningProspectusWhere(storeId, now),
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      items: { where: { product: VISIBLE_PRODUCT }, select: { price: true, product: { select: ITEM_PRODUCT } } },
    },
  });
  if (!prospectus) return null;
  const { items, ...rest } = prospectus;
  const list = offers(items, prospectus.endsAt);
  return list.length ? { ...rest, offers: list } : null;
}

// Prospectus publié et pas encore terminé, pour sa page (avec son magasin)
export async function publicProspectus(id: string, now = new Date()) {
  const prospectus = await prisma.prospectus.findFirst({
    where: { id, publishedAt: { not: null }, endsAt: { gt: now } },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      store: { select: { id: true, name: true } },
      items: { where: { product: VISIBLE_PRODUCT }, select: { price: true, product: { select: ITEM_PRODUCT } } },
    },
  });
  if (!prospectus) return null;
  const { items, ...rest } = prospectus;
  return { ...rest, offers: offers(items, prospectus.endsAt) };
}

// Prospectus du back-office : ceux du magasin (tous pour le siège), les plus récents d'abord
export function adminProspectuses(storeId: string | undefined) {
  return prisma.prospectus.findMany({
    where: storeId ? { storeId } : {},
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      publishedAt: true,
      store: { select: { name: true } },
      _count: { select: { items: true } },
      items: { take: 4, select: { product: { select: { id: true, picture: true } } } },
    },
  });
}

export type AdminProspectus = Awaited<ReturnType<typeof adminProspectuses>>[number];

// Prospectus à modifier, avec ses produits et leur prix actuel
export function prospectusForEdit(id: string) {
  return prisma.prospectus.findUnique({
    where: { id },
    select: {
      id: true,
      storeId: true,
      title: true,
      startsAt: true,
      endsAt: true,
      publishedAt: true,
      store: { select: { name: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          price: true,
          product: { select: { id: true, name: true, netContent: true, picture: true, barCode: true, price: true, regularPrice: true } },
        },
      },
    },
  });
}
