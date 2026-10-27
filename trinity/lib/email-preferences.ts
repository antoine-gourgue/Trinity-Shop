import { isValidSignature, sign } from "@/lib/signing";
import { siteUrl } from "@/lib/site-url";

// E-mails commerciaux auxquels le client peut se désinscrire
export const EMAIL_TOPICS = ["cart-reminders", "favorite-promos"] as const;

export type EmailTopic = (typeof EMAIL_TOPICS)[number];

export function isEmailTopic(value: string): value is EmailTopic {
  return (EMAIL_TOPICS as readonly string[]).includes(value);
}

// Réglage du compte qui autorise ce type d'e-mail
export function topicSetting(topic: EmailTopic, enabled: boolean) {
  return topic === "cart-reminders" ? { cartReminders: enabled } : { favoritePromos: enabled };
}

// Le lien de désinscription vaut pour un compte et un type d'e-mail
export function unsubscribeSignature(userId: string, topic: EmailTopic) {
  return sign(`${topic}:${userId}`);
}

export function isValidUnsubscribeSignature(userId: string, topic: EmailTopic, signature: string) {
  return isValidSignature(`${topic}:${userId}`, signature);
}

export function unsubscribeUrl(userId: string, topic: EmailTopic) {
  const params = new URLSearchParams({ u: userId, t: topic, s: unsubscribeSignature(userId, topic) });
  return `${siteUrl()}/api/emails/unsubscribe?${params.toString()}`;
}
