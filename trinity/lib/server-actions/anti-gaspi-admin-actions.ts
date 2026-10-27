"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { AccessDeniedError, requireBackOffice } from "@/services/auth/guards";
import type { AdminResult } from "@/lib/server-actions/admin-actions";

// Fin de vie des lots du back-office : un compte magasin gère les siens, le siège ceux de tout le réseau

const fail = (error: string): AdminResult => ({ ok: false, error });

// Clôt un lot à date courte : les unités restantes sont données (association, banque alimentaire) ou
// jetées, et quittent le stock du magasin
export async function closeLot(lotId: string, outcome: "donated" | "wasted"): Promise<AdminResult> {
  const access = await requireBackOffice();
  if (outcome !== "donated" && outcome !== "wasted") return fail("Issue du lot invalide.");
  const lot = await prisma.stockLot.findUnique({ where: { id: lotId }, select: { storeId: true, productId: true, closedAt: true } });
  if (!lot) return fail("Lot introuvable.");
  if (access.store && lot.storeId !== access.store.id) throw new AccessDeniedError();
  if (lot.closedAt) return fail("Ce lot est déjà clos.");

  const closed = await prisma.$transaction(async (tx) => {
    // Quantité relue dans la transaction : une commande a pu prendre des unités entre-temps
    const current = await tx.stockLot.findUnique({ where: { id: lotId }, select: { quantity: true, closedAt: true } });
    if (!current || current.closedAt) return false;
    await tx.stockLot.update({
      where: { id: lotId },
      data: {
        quantity: 0,
        closedAt: new Date(),
        ...(outcome === "donated" ? { donatedQuantity: { increment: current.quantity } } : { wastedQuantity: { increment: current.quantity } }),
      },
    });
    const stock = await tx.storeStock.findUnique({
      where: { storeId_productId: { storeId: lot.storeId, productId: lot.productId } },
      select: { quantity: true },
    });
    if (stock && current.quantity > 0) {
      await tx.storeStock.update({
        where: { storeId_productId: { storeId: lot.storeId, productId: lot.productId } },
        data: { quantity: Math.max(0, stock.quantity - current.quantity) },
      });
    }
    return true;
  });
  if (!closed) return fail("Ce lot a changé entre-temps : rechargez la page.");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
