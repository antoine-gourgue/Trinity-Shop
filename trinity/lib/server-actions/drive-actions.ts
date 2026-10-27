"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { requireOrderManagement } from "@/services/auth/guards";
import { canCheckIn, DRIVE_SPOTS } from "@/lib/drive";
import { isValidArrivalSignature } from "@/lib/drive-links";
import { sendOrderStatusEmail } from "@/lib/order-emails";

export type DriveResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): DriveResult => ({ ok: false, error });

const checkInSchema = z.object({
  orderId: z.string().min(1),
  spot: z.number().int().min(1).max(DRIVE_SPOTS),
  // Signature du lien envoyé par e-mail, pour un client qui n'est pas connecté
  signature: z.string().max(128).optional(),
});

// « Je suis arrivé » : le client indique sa place sur le parking du drive. Une seconde arrivée ne
// change que la place, l'heure d'arrivée reste la première.
export async function checkIn(orderId: string, spot: number, signature?: string): Promise<DriveResult> {
  const parsed = checkInSchema.safeParse({ orderId, spot, signature });
  if (!parsed.success) return fail(`Choisissez une place entre 1 et ${DRIVE_SPOTS}.`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, status: true, shippingAddressId: true, arrivedAt: true },
  });
  if (!order) return fail("Commande introuvable.");
  const signed = !!parsed.data.signature && isValidArrivalSignature(orderId, parsed.data.signature);
  if (!signed) {
    const session = await auth();
    if (session?.user?.id !== order.userId) return fail("Ce lien d'arrivée n'est pas valable.");
  }
  if (!canCheckIn(order)) {
    return fail(
      order.shippingAddressId
        ? "Cette commande est livrée à domicile."
        : order.status === "completed"
          ? "Vos courses vous ont déjà été remises."
          : "Vos courses ne sont pas encore prêtes : nous vous écrirons dès qu'elles le seront."
    );
  }

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: "ready" },
    data: { parkingSpot: parsed.data.spot, arrivedAt: order.arrivedAt ?? new Date() },
  });
  if (count === 0) return fail("Votre commande a changé entre-temps : rechargez la page.");
  revalidatePath("/admin/drive");
  revalidatePath(`/user/${order.userId}/order/${orderId}`);
  return { ok: true };
}

// Courses remises au client sur le parking : la commande est terminée et le client remercié
export async function handOverOrder(orderId: string): Promise<DriveResult> {
  await requireOrderManagement(orderId);
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: "ready", shippingAddressId: null },
    data: { status: "completed", completedAt: new Date() },
  });
  if (count === 0) return fail("Cette commande n'est plus en attente au drive : rechargez la page.");
  after(() => sendOrderStatusEmail(orderId, { status: "completed" }));
  revalidatePath("/admin", "layout");
  return { ok: true };
}
