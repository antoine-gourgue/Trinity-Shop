'use server'

import prisma from "@/lib/prisma"

export async function updateStock(stockId: string, quantity: number) {
    return prisma.stock.update({
        where: {id: stockId},
        data: {quantity},
    });
}

export async function deleteStock(stockId: string) {
    return prisma.stock.delete({
        where: {id: stockId},
    });
}
