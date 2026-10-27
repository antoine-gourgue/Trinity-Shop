// Prix unitaire d'une ligne de commande : celui fixé à la commande, sinon (commandes plus anciennes)
// le prix actuel du produit. Fonction pure, utilisable dans les composants client.
export function linePrice(line: { unitPrice?: number | null; product: { price: number } }) {
  return line.unitPrice ?? line.product.price;
}
