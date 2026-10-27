// Répartition du stock entre les magasins, partagée par le seed et par l'import des marques nationales.
// Déterministe : un même produit a toujours le même stock dans un même magasin, d'une exécution à l'autre.

// Empreinte FNV-1a 32 bits d'un texte, ramenée entre 0 et 1
function unit(text: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0xffffffff;
}

// Part des couples magasin × produit en rupture
const RUPTURE_RATE = 0.01;

// Stock d'un produit dans un magasin, à partir de son stock de référence. Le magasin historique garde
// le stock d'origine ; les autres en ont de 40 % à 140 %, avec quelques ruptures.
export function storeQuantity(reference: number, storeSlug: string, productKey: string, historic: boolean) {
  if (historic) return reference;
  const draw = unit(`${storeSlug}:${productKey}`);
  if (draw < RUPTURE_RATE) return 0;
  return Math.round(reference * (0.4 + unit(`${productKey}:${storeSlug}`)));
}
