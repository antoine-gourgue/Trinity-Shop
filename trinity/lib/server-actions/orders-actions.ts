'use server'

import prisma from '@/lib/prisma'
import { buildInvoicePdf } from '@/lib/invoice-pdf'
import { orderNumber } from '@/lib/account'
import { formatPickupDate } from '@/lib/checkout'
import { orderDeliveryFee } from '@/lib/delivery'
import { requireOrderAccess } from '@/services/auth/guards'


export async function generateInvoice(orderId: string): Promise<string> {
    await requireOrderAccess(orderId);
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: true,
            billingAddress: true,
            shippingAddress: true,
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
    const shipping = order.shippingAddress;
    const number = orderNumber(order.id);
    const itemsTotal = order.cart.productsInCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

    return buildInvoicePdf({
        invoiceNumber: `FAC-${number}`,
        orderNumber: number,
        createdAt: order.createdAt,
        pickupLabel: order.pickupSlot ? formatPickupDate(order.pickupSlot) : null,
        delivery: shipping
            ? { address: [shipping.street, `${shipping.zipCode} ${shipping.city}`], fee: orderDeliveryFee(order, itemsTotal) }
            : null,
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

