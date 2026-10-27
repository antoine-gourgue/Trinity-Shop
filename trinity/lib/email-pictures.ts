import { absoluteUrl } from "@/lib/site-url";
import { localImageFor } from "@/lib/product-images";

// Photo d'un produit dans un e-mail : copie locale du site si elle existe (une messagerie ne peut pas
// basculer sur une autre image comme le fait le site), sinon l'image d'origine, sinon aucune.
// `checked` garde les réponses déjà obtenues pendant un envoi groupé.
export async function emailPicture(picture: string, checked: Map<string, string | null>) {
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
