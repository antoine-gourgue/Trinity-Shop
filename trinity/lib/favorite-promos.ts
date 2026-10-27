import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";
import { emailSender } from "@/lib/email-sender";
import { unsubscribeUrl } from "@/lib/email-preferences";
import { emailPicture } from "@/lib/email-pictures";
import { formatPromoEnd } from "@/lib/promotions";
import { FavoritePromosEmail, type FavoritePromoItem } from "@/components/emails/favorite-promos-email";

// Favoris examinés par passage de la tâche planifiée
const BATCH = 500;

export interface FavoritePromoAlert {
  user: { id: string; email: string; firstName: string };
  products: { id: string; name: string; price: number; regularPrice: number; picture: string; promoEndsAt: Date | null }[];
}

// Favoris en promotion dont le client n'a pas encore été prévenu, regroupés par client : un seul e-mail
// par client, vers une adresse confirmée, s'il accepte ces alertes
export async function findFavoritePromoAlerts(): Promise<FavoritePromoAlert[]> {
  const favorites = await prisma.favorite.findMany({
    where: {
      promoNotifiedAt: null,
      product: { hidden: false, regularPrice: { not: null } },
      user: { favoritePromos: true, emailVerified: { not: null } },
    },
    orderBy: [{ userId: "asc" }, { createdAt: "desc" }],
    select: {
      user: { select: { id: true, email: true, firstName: true } },
      product: { select: { id: true, name: true, price: true, regularPrice: true, picture: true, promoEndsAt: true } },
    },
    take: BATCH,
  });

  const alerts = new Map<string, FavoritePromoAlert>();
  for (const { user, product } of favorites) {
    // Prix barré supérieur au prix de vente : sinon ce n'est pas une vraie remise
    if (product.regularPrice === null || product.regularPrice <= product.price) continue;
    const alert = alerts.get(user.id) ?? { user, products: [] };
    alert.products.push({ ...product, regularPrice: product.regularPrice });
    alerts.set(user.id, alert);
  }
  return [...alerts.values()];
}

// Envoie les alertes ; sans clé Resend, rien n'est envoyé ni marqué
export async function sendFavoritePromoAlerts(now = new Date()) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { candidates: 0, sent: 0 };

  const alerts = await findFavoritePromoAlerts();
  const resend = new Resend(apiKey);
  const pictures = new Map<string, string | null>();
  let sent = 0;

  for (const { user, products } of alerts) {
    // Favoris marqués avant l'envoi, et seulement s'ils ne l'ont pas déjà été : Vercel peut lancer
    // la tâche deux fois, le client ne reçoit pas de doublon
    const { count } = await prisma.favorite.updateMany({
      where: { userId: user.id, productId: { in: products.map((product) => product.id) }, promoNotifiedAt: null },
      data: { promoNotifiedAt: now },
    });
    if (count === 0) continue;

    const items: FavoritePromoItem[] = await Promise.all(
      products.map(async (product) => ({
        name: product.name,
        price: product.price,
        regularPrice: product.regularPrice,
        picture: await emailPicture(product.picture, pictures),
        endsOn: product.promoEndsAt ? formatPromoEnd(product.promoEndsAt) : null,
      }))
    );

    const unsubscribe = unsubscribeUrl(user.id, "favorite-promos");
    const { error } = await resend.emails.send({
      from: emailSender(),
      to: [user.email],
      subject:
        items.length > 1 ? `${user.firstName}, ${items.length} de vos favoris sont en promo` : `${user.firstName}, un de vos favoris est en promo`,
      react: FavoritePromosEmail({ firstName: user.firstName, items, siteUrl: siteUrl(), unsubscribeUrl: unsubscribe }),
      // Désinscription en un clic proposée par les messageries (Gmail, Apple Mail)
      headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (error) console.error("Alerte promo non envoyée :", error);
    else sent += 1;
  }

  return { candidates: alerts.length, sent };
}
