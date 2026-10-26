'use server'

import prisma from '@/lib/prisma'
import { buildInvoicePdf } from '@/lib/invoice-pdf'
import { orderNumber } from '@/lib/account'
import { formatPickupDate } from '@/lib/checkout'

export async function deleteOrder(orderId: string) {
    return prisma.order.delete({
        where: { id: orderId },
    });
}


export async function generateInvoice(orderId: string): Promise<string> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: true,
            billingAddress: true,
            cart: {
                include: {
                    productsInCart: {
                        include: { product: { include: { brand: true } } },
                        orderBy: { createdAt: "asc" },
                    },
                },
            },
        },
    });

    if (!order) {
        throw new Error("Commande introuvable");
    }

    const address = order.billingAddress;
    const number = orderNumber(order.id);

    return buildInvoicePdf({
        invoiceNumber: `FAC-${number}`,
        orderNumber: number,
        createdAt: order.createdAt,
        pickupLabel: order.pickupSlot ? formatPickupDate(order.pickupSlot) : null,
        loyalty: {
            discount: order.loyaltyDiscount,
            pointsUsed: order.loyaltyPointsUsed,
            pointsEarned: order.loyaltyPointsEarned,
            cardNumber: order.user.loyaltyNumber,
        },
        customer: {
            name: `${order.user.firstName} ${order.user.lastName}`,
            email: order.user.email,
            address: address ? [address.street, `${address.zipCode} ${address.city}`, address.country] : [],
        },
        items: order.cart.productsInCart.map(({ product, quantity }) => ({
            name: product.name,
            brand: product.brand?.name ?? null,
            netContent: product.netContent,
            quantity,
            price: product.price,
            regularPrice: product.regularPrice,
        })),
    });
}

export async function getOrderById(orderId: string) {
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
        },
    });
}

