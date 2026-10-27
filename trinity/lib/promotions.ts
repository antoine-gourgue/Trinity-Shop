import prisma from "@/lib/prisma";

// Une promotion est saisie par son dernier jour : elle s'arrête à minuit (heure de Paris) le lendemain
export function promoEndFromDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  // Minuit UTC le lendemain, puis recul du décalage de Paris à cet instant (1 h l'hiver, 2 h l'été)
  const utcMidnight = new Date(Date.UTC(year, month - 1, date + 1));
  const parisHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(utcMidnight)
  );
  return new Date(utcMidnight.getTime() - parisHour * 3_600_000);
}

// Dernier jour d'une promotion (AAAA-MM-JJ, heure de Paris), pour la réafficher dans le formulaire
export function promoLastDay(end: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(end.getTime() - 1)
  );
}

// « jusqu'au dimanche 2 novembre » pour la fiche produit
export function formatPromoEnd(end: Date) {
  return new Date(end.getTime() - 1).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
}

// La promotion d'un produit est terminée : la prochaine déclenchera de nouveau l'alerte des clients qui l'ont en favori
export function rearmFavoritePromoAlerts(productIds: string[]) {
  return prisma.favorite.updateMany({
    where: { productId: { in: productIds }, promoNotifiedAt: { not: null } },
    data: { promoNotifiedAt: null },
  });
}

// Promotions terminées : le prix barré redevient le prix de vente
export async function expirePromotions(now = new Date()) {
  const expired = await prisma.product.findMany({
    where: { promoEndsAt: { lte: now } },
    select: { id: true, regularPrice: true },
  });
  if (expired.length === 0) return [];

  const ids = expired.map((product) => product.id);
  await prisma.$transaction([
    ...expired.map((product) =>
      prisma.product.update({
        where: { id: product.id },
        data: product.regularPrice ? { price: product.regularPrice, regularPrice: null, promoEndsAt: null } : { promoEndsAt: null },
      })
    ),
    rearmFavoritePromoAlerts(ids),
  ]);
  return ids;
}
