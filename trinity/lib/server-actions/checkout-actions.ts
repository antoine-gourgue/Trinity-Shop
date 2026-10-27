"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { SLOT_CAPACITY, pickupHours, slotParam, slotToDate } from "@/lib/checkout";
import { currentStore } from "@/lib/current-store";

const pickupDatesSchema = z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(14);

// Créneaux complets du drive du client parmi les jours proposés, au format « AAAA-MM-JJ_HH » ;
// les commandes annulées libèrent leur place
export async function getFullSlots(dates: string[]): Promise<string[]> {
  const parsed = pickupDatesSchema.safeParse(dates);
  if (!parsed.success || parsed.data.length === 0) return [];
  const store = await currentStore();
  if (!store) return [];

  const slotByTime = new Map(
    parsed.data.flatMap((date) => pickupHours().map((start) => [slotToDate({ date, start }).getTime(), slotParam({ date, start })] as const))
  );
  const groups = await prisma.order.groupBy({
    by: ["pickupSlot"],
    where: { storeId: store.id, pickupSlot: { in: [...slotByTime.keys()].map((time) => new Date(time)) }, status: { not: "cancelled" } },
    _count: { _all: true },
  });
  return groups.flatMap((group) => {
    const slot = group.pickupSlot ? slotByTime.get(group.pickupSlot.getTime()) : undefined;
    return slot && group._count._all >= SLOT_CAPACITY ? [slot] : [];
  });
}

// Adresses du client connecté pour la livraison à domicile (adresses de livraison d'abord)
export async function getMyAddresses() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    select: { id: true, type: true, street: true, zipCode: true, city: true, country: true },
    orderBy: { createdAt: "asc" },
  });
  return addresses.sort((a, b) => Number(b.type === "livraison") - Number(a.type === "livraison"));
}
