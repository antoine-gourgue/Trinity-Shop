import { isValidSignature, sign } from "@/lib/signing";
import { siteUrl } from "@/lib/site-url";

// Lien « Je suis arrivé » de l'e-mail « commande prête » : il marche sans connexion (le client est
// sur le parking, souvent sur son téléphone) mais ne vaut que pour cette commande
const payload = (orderId: string) => `drive-arrival:${orderId}`;

export function arrivalSignature(orderId: string) {
  return sign(payload(orderId));
}

export function isValidArrivalSignature(orderId: string, signature: string) {
  return isValidSignature(payload(orderId), signature);
}

export function arrivalUrl(orderId: string) {
  return `${siteUrl()}/drive/arrivee/${orderId}?s=${arrivalSignature(orderId)}`;
}
