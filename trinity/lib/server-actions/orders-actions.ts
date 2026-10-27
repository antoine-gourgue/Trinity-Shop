'use server'

import prisma from '@/lib/prisma'
import { buildInvoicePdf } from '@/lib/invoice-pdf'
import { loadInvoice } from '@/lib/invoice-data'
import { requireOrderAccess } from '@/services/auth/guards'


export async function generateInvoice(orderId: string): Promise<string> {
    await requireOrderAccess(orderId);
    const invoice = await loadInvoice(orderId);
    if (!invoice) {
        throw new Error("Commande introuvable");
    }
    return buildInvoicePdf(invoice.data);
}

export async function getOrderById(orderId: string) {
    await requireOrderAccess(orderId);
    return prisma.order.findUnique({
        where: { id: orderId },
        include: {
            cart: {
                include: {
                    productsInCart: {
                        include: {
                            product: {
                                include: {
                                    brand: true,
                                    categories: {
                                        include: {
                                            category: true,
                                        },
                                    },
                                },
                            },
                            substitute: { select: { id: true, name: true, price: true } },
                        },
                    },
                },
            },
            user: {
                include: {
                    addresses: true,
                },
            },
            shippingAddress: true,
            billingAddress: true,
            store: { select: { name: true, street: true, zipCode: true, city: true, hours: true } },
        },
    });
}

