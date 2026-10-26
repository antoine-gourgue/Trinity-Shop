'use server'

import prisma from "@/lib/prisma"
import { requireAdmin } from "@/services/auth/guards"

export async function updateStock(stockId: string, quantity: number) {
    await requireAdmin();
    return prisma.stock.update({
        where: {id: stockId},
        data: {quantity},
    });
}

export async function deleteStock(stockId: string) {
    await requireAdmin();
    return prisma.stock.delete({
        where: {id: stockId},
    });
}
