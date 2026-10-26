import prisma from "@/lib/prisma";

// Remet en stock les articles d'une commande annulée (à passer dans un prisma.$transaction)
export function restock(items: { productId: string; quantity: number }[]) {
  return items.map((item) =>
    prisma.stock.updateMany({ where: { productId: item.productId }, data: { quantity: { increment: item.quantity } } })
  );
}
