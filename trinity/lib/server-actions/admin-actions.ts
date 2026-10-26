"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nutriScore, Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { restock } from "@/lib/stock";
import { canCancelOrder, nextOrderStatus } from "@/lib/order-status";
import { currentAccess, requireAdmin } from "@/services/auth/guards";

// Actions du back-office : toutes réservées aux administrateurs. Elles renvoient un
// résultat plutôt que de lever une erreur, pour afficher un message utile à l'écran.

export type AdminResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): AdminResult => ({ ok: false, error });

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Données invalides.";
}

// Prix saisis en euros, stockés en millièmes d'euro
const euros = (value: number) => Math.round(value * 100) * 10;

// ——— Produits ———

const productSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom du produit est trop court."),
    brand: z.string().trim().min(1, "Indiquez une marque."),
    price: z.number({ invalid_type_error: "Prix invalide." }).positive("Le prix doit être positif.").max(1000, "Prix trop élevé."),
    regularPrice: z.number().positive().max(1000).nullable(),
    netContent: z.string().trim().max(60).nullable(),
    description: z.string().trim().max(2000),
    nutriScore: z.nativeEnum(nutriScore).nullable(),
    categories: z.array(z.string()).max(40),
    hidden: z.boolean(),
    stock: z.number().int("Le stock doit être un nombre entier.").min(0, "Le stock ne peut pas être négatif.").max(100000),
  })
  .refine((data) => data.regularPrice === null || data.regularPrice > data.price, {
    message: "Le prix barré doit être supérieur au prix de vente.",
  });

export type ProductInput = z.infer<typeof productSchema>;

export async function saveProduct(productId: string, input: ProductInput): Promise<AdminResult> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;

  const known = await prisma.category.findMany({ where: { name: { in: data.categories } }, select: { name: true } });
  const brand =
    (await prisma.brand.findFirst({ where: { name: data.brand }, select: { id: true } })) ??
    (await prisma.brand.create({ data: { name: data.brand }, select: { id: true } }));

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        brandId: brand.id,
        price: euros(data.price),
        regularPrice: data.regularPrice === null ? null : euros(data.regularPrice),
        netContent: data.netContent || null,
        description: data.description,
        nutriScore: data.nutriScore,
        hidden: data.hidden,
      },
    }),
    prisma.categoriesProducts.deleteMany({ where: { productId } }),
    prisma.categoriesProducts.createMany({ data: known.map((c) => ({ productId, categoryName: c.name })) }),
    prisma.stock.upsert({
      where: { productId },
      update: { quantity: data.stock },
      create: { productId, quantity: data.stock },
    }),
  ]);

  revalidatePath("/admin", "layout");
  revalidatePath(`/product/${productId}`);
  return { ok: true };
}

export async function setProductHidden(productId: string, hidden: boolean): Promise<AdminResult> {
  await requireAdmin();
  await prisma.product.update({ where: { id: productId }, data: { hidden } });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Un produit déjà commandé reste en base pour l'historique : on propose de le masquer
export async function deleteProduct(productId: string): Promise<AdminResult> {
  await requireAdmin();
  const ordered = await prisma.productInCart.count({ where: { productId, cart: { orders: { some: {} } } } });
  if (ordered > 0) {
    return fail("Ce produit figure dans des commandes passées : masquez-le plutôt que de le supprimer.");
  }

  await prisma.$transaction([
    prisma.productInCart.deleteMany({ where: { productId } }),
    prisma.categoriesProducts.deleteMany({ where: { productId } }),
    prisma.stock.deleteMany({ where: { productId } }),
    prisma.product.delete({ where: { id: productId } }),
  ]);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ——— Stocks ———

export async function updateStockQuantity(stockId: string, quantity: number): Promise<AdminResult> {
  await requireAdmin();
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000) {
    return fail("Indiquez une quantité entière entre 0 et 100 000.");
  }
  await prisma.stock.update({ where: { id: stockId }, data: { quantity } });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ——— Clients ———

const customerSchema = z.object({
  firstName: z.string().trim().min(1, "Indiquez un prénom."),
  lastName: z.string().trim().min(1, "Indiquez un nom."),
  email: z.string().trim().email("Adresse e-mail invalide."),
  phone: z.string().trim().max(30).nullable(),
  role: z.nativeEnum(Role),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export async function updateCustomer(userId: string, input: CustomerInput): Promise<AdminResult> {
  await requireAdmin();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;

  const me = await currentAccess();
  if (me?.id === userId && data.role !== Role.Admin) {
    return fail("Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
  }

  const taken = await prisma.user.findFirst({
    where: {
      id: { not: userId },
      OR: [{ email: data.email }, ...(data.phone ? [{ phone: data.phone }] : [])],
    },
    select: { email: true },
  });
  if (taken) {
    return fail(taken.email === data.email ? "Cette adresse e-mail est déjà utilisée." : "Ce numéro de téléphone est déjà utilisé.");
  }

  await prisma.user.update({ where: { id: userId }, data: { ...data, phone: data.phone || null } });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Supprime le compte et tout ce qui s'y rattache (paniers, commandes, adresses, points)
export async function deleteCustomer(userId: string): Promise<AdminResult> {
  await requireAdmin();
  const me = await currentAccess();
  if (me?.id === userId) return fail("Vous ne pouvez pas supprimer votre propre compte depuis l'administration.");

  await prisma.$transaction([
    prisma.productInCart.deleteMany({ where: { cart: { userId } } }),
    // La suppression des paniers emporte les commandes associées
    prisma.cart.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ——— Commandes ———

const ORDER_REVERSAL = {
  userId: true,
  cartId: true,
  status: true,
  stockDeducted: true,
  loyaltyPointsEarned: true,
  loyaltyPointsUsed: true,
  user: { select: { loyaltyPoints: true } },
  cart: { select: { productsInCart: { select: { productId: true, quantity: true } } } },
} satisfies Prisma.OrderSelect;

// Ce que défait une annulation : points gagnés retirés et bons utilisés rendus au client,
// articles remis en stock s'ils avaient été décomptés
function reverseOrder(orderId: string, order: Prisma.OrderGetPayload<{ select: typeof ORDER_REVERSAL }>) {
  // Le solde ne descend pas sous zéro si le client a déjà dépensé les points gagnés
  const pointsDelta = order.loyaltyPointsUsed - order.loyaltyPointsEarned;
  const balance = Math.max(0, order.user.loyaltyPoints + pointsDelta);
  return [
    prisma.loyaltyTransaction.deleteMany({ where: { orderId } }),
    ...(pointsDelta !== 0 ? [prisma.user.update({ where: { id: order.userId }, data: { loyaltyPoints: balance } })] : []),
    ...(order.stockDeducted ? restock(order.cart.productsInCart) : []),
  ];
}

// Fait passer la commande à l'étape suivante (reçue → en préparation → prête → retirée ou livrée)
export async function advanceOrderStatus(orderId: string): Promise<AdminResult> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return fail("Commande introuvable.");
  const next = nextOrderStatus(order.status);
  if (!next) return fail("Cette commande est déjà terminée ou annulée.");

  // Mise à jour conditionnelle : deux clics simultanés ne sautent pas d'étape
  const { count } = await prisma.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: next } });
  if (count === 0) return fail("La commande a changé entre-temps : rechargez la page.");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Annule la commande sans l'effacer : elle reste visible, marquée « Annulée »
export async function cancelOrder(orderId: string): Promise<AdminResult> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: ORDER_REVERSAL });
  if (!order) return fail("Commande introuvable.");
  if (!canCancelOrder(order.status)) return fail("Une commande terminée ou déjà annulée ne peut pas être annulée.");

  await prisma.$transaction([
    ...reverseOrder(orderId, order),
    prisma.order.update({ where: { id: orderId }, data: { status: "cancelled", stockDeducted: false } }),
  ]);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Supprime définitivement la commande ; une commande annulée a déjà été défaite
export async function deleteOrder(orderId: string): Promise<AdminResult> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: ORDER_REVERSAL });
  if (!order) return fail("Commande introuvable.");

  await prisma.$transaction([
    ...(order.status === "cancelled" ? [] : reverseOrder(orderId, order)),
    prisma.productInCart.deleteMany({ where: { cartId: order.cartId } }),
    // Le panier archivé n'a plus d'usage : sa suppression emporte la commande
    prisma.cart.delete({ where: { id: order.cartId } }),
  ]);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
