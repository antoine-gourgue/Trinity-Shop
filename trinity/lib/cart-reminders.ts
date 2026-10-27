import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { absoluteUrl, siteUrl } from "@/lib/site-url";
import { emailSender } from "@/lib/email-sender";
import { unsubscribeUrl } from "@/lib/email-preferences";
import { localImageFor } from "@/lib/product-images";
import { CartReminderEmail } from "@/components/emails/cart-reminder-email";

const HOUR = 3_600_000;
// Panier abandonné : aucune modification depuis 3 heures, mais une activité dans les 7 derniers jours
const IDLE_FOR = 3 * HOUR;
const ACTIVE_WITHIN = 7 * 24 * HOUR;
// Envois par passage de la tâche planifiée
const BATCH = 100;

// Photo d'un produit dans l'e-mail : copie locale du site si elle existe (une messagerie ne peut pas
// basculer sur une autre image comme le fait le site), sinon l'image d'origine, sinon aucune
async function emailPicture(picture: string, checked: Map<string, string | null>) {
  if (!picture) return null;
  const known = checked.get(picture);
  if (known !== undefined) return known;

  const local = localImageFor(picture);
  let url: string | null = absoluteUrl(picture);
  if (local) {
    const response = await fetch(absoluteUrl(local), { method: "HEAD" }).catch(() => null);
    if (response?.ok) url = absoluteUrl(local);
  }
  checked.set(picture, url);
  return url;
}

// Paniers à relancer : un seul rappel tant que le panier n'a pas changé depuis le précédent
export async function findAbandonedCarts(now = new Date()) {
  const carts = await prisma.cart.findMany({
    where: {
      archived: false,
      user: { cartReminders: true },
      productsInCart: {
        some: { updatedAt: { gte: new Date(now.getTime() - ACTIVE_WITHIN) } },
        none: { updatedAt: { gt: new Date(now.getTime() - IDLE_FOR) } },
      },
    },
    select: {
      id: true,
      reminderSentAt: true,
      user: { select: { id: true, email: true, firstName: true } },
      productsInCart: {
        orderBy: { updatedAt: "desc" },
        select: { quantity: true, updatedAt: true, product: { select: { name: true, price: true, picture: true, hidden: true } } },
      },
    },
    take: BATCH,
  });

  return carts.filter((cart) => {
    const lastChange = cart.productsInCart[0]?.updatedAt;
    return !!lastChange && (!cart.reminderSentAt || cart.reminderSentAt < lastChange);
  });
}

// Envoie les rappels ; sans clé Resend, rien n'est envoyé ni marqué
export async function sendCartReminders(now = new Date()) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { candidates: 0, sent: 0 };

  const carts = await findAbandonedCarts(now);
  const resend = new Resend(apiKey);
  const pictures = new Map<string, string | null>();
  let sent = 0;

  for (const cart of carts) {
    const items = await Promise.all(
      cart.productsInCart
        .filter((item) => !item.product.hidden)
        .map(async ({ quantity, product }) => ({
          name: product.name,
          quantity,
          price: product.price,
          picture: await emailPicture(product.picture, pictures),
        }))
    );
    if (items.length === 0) continue;

    // Rappel marqué avant l'envoi, et seulement s'il ne l'a pas déjà été : Vercel peut lancer
    // la tâche deux fois, le client ne reçoit pas de doublon
    const { count } = await prisma.cart.updateMany({
      where: { id: cart.id, reminderSentAt: cart.reminderSentAt },
      data: { reminderSentAt: now },
    });
    if (count === 0) continue;

    const unsubscribe = unsubscribeUrl(cart.user.id);
    const { error } = await resend.emails.send({
      from: emailSender(),
      to: [cart.user.email],
      subject: `${cart.user.firstName}, votre panier vous attend`,
      react: CartReminderEmail({ firstName: cart.user.firstName, items, siteUrl: siteUrl(), unsubscribeUrl: unsubscribe }),
      // Désinscription en un clic proposée par les messageries (Gmail, Apple Mail)
      headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (error) console.error("Rappel de panier non envoyé :", error);
    else sent += 1;
  }

  return { candidates: carts.length, sent };
}
