// Préparation d'une commande en magasin : ce que le préparateur a réellement mis dans le bac, et ce
// qu'il faut rembourser au client. Fonctions pures, partagées par l'écran de préparation, la
// validation, les e-mails et la facture.

export interface PreparationLine {
  quantity: number;
  // Quantité prélevée en rayon ; null tant que l'article n'est pas traité
  preparedQuantity: number | null;
  allowSubstitute: boolean;
  product: { name: string; price: number };
  // Produit équivalent donné pour la quantité manquante
  substitute: { name: string; price: number } | null;
  // Remise anti-gaspi de la ligne : le client a payé moins que le prix catalogue
  antiGaspiDiscount?: number;
}

export interface PreparationChange {
  name: string;
  missing: number;
  // Nom du produit donné à la place, ou null si l'article manque simplement
  substitute: string | null;
  // Montant remboursé pour cette ligne, en millièmes d'euro
  refund: number;
}

// Résultat d'une ligne : un remplaçant est facturé au prix le plus bas des deux, un article manquant
// sans remplaçant est remboursé, toujours sur la base du prix payé (remise anti-gaspi déduite)
export function lineOutcome(line: PreparationLine) {
  const prepared = Math.min(line.quantity, Math.max(0, line.preparedQuantity ?? line.quantity));
  const missing = line.quantity - prepared;
  const substitute = missing > 0 && line.allowSubstitute ? line.substitute : null;
  const paidUnit = line.product.price - (line.antiGaspiDiscount ?? 0) / line.quantity;
  const owed = substitute ? missing * Math.max(0, paidUnit - substitute.price) : missing * paidUnit;
  // Arrondi au centime (prix en millièmes d'euro)
  const refund = Math.round(owed / 10) * 10;
  return { prepared, missing, substitute, refund };
}

export function preparationSummary(lines: PreparationLine[]) {
  const pending = lines.filter((line) => line.preparedQuantity === null).length;
  const changes: PreparationChange[] = lines.flatMap((line) => {
    const { missing, substitute, refund } = lineOutcome(line);
    return missing > 0 ? [{ name: line.product.name, missing, substitute: substitute?.name ?? null, refund }] : [];
  });
  return {
    pending,
    done: pending === 0,
    refund: changes.reduce((total, change) => total + change.refund, 0),
    changes,
  };
}
