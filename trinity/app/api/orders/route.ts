import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { isAdmin } from "@/services/auth/guards";
import { parseSlotParam, slotToDate } from "@/lib/checkout";
import { auth } from "@/auth";
import { orderNumber } from "@/lib/account";
import { POINTS_PER_VOUCHER, VOUCHER_VALUE, maxVouchers, pointsForAmount } from "@/lib/loyalty";

class InvalidVouchersError extends Error {}

export async function GET(request: NextRequest) {
    const isLoggedIn = await isUserLoggedIn()
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401}
        );
    }

    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const orders = await prisma.order.findMany({
            select: {
                id: true,
                billingAddress: true,
                user: {
                  select: {
                      firstName: true,
                      lastName: true,
                  }
                },
                cart: {
                    select: {
                        productsInCart: {
                            select: {
                                quantity: true,
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        price: true,
                                    }
                                },
                            }
                        }
                    }
                },
            },
        });
        return NextResponse.json({ data: orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const isLoggedIn = await isUserLoggedIn()
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401}
        );
    }

    try {
        const body = await request.json();
        const { userId, cartId } = body;
        let { billingAddressId } = body;

        // Créneau de retrait facultatif (« 2026-10-28_18 ») : accepté seulement s'il est à venir
        const slot = parseSlotParam(body.pickupSlot);
        const pickupSlot = slot ? slotToDate(slot) : null;
        if (body.pickupSlot && (!pickupSlot || pickupSlot.getTime() <= Date.now())) {
            return NextResponse.json({ error: "Invalid pickup slot" }, { status: 400 });
        }

        if (!userId || !cartId) {
            return NextResponse.json(
                { error: "User ID and Cart ID are required" },
                { status: 400 }
            );
        }

        // Une commande ne peut être passée que pour le compte connecté
        const session = await auth();
        if (session?.user?.id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Bons Carte Trinity demandés (100 points = 5 €), vérifiés plus bas dans la transaction
        const requestedVouchers = Number.isInteger(body.loyaltyVouchers) ? Math.max(0, body.loyaltyVouchers) : 0;

        // Adresse de facturation résolue côté serveur : la session peut être
        // antérieure à la création d'une adresse, et un nouveau compte n'en a pas
        if (!billingAddressId) {
            const existingAddress = await prisma.address.findFirst({
                where: { userId },
                orderBy: { createdAt: "asc" },
            });

            if (existingAddress) {
                billingAddressId = existingAddress.id;
            } else {
                const defaultAddress = await prisma.address.create({
                    data: {
                        userId,
                        type: "domicile",
                        street: "1 rue de la Démonstration",
                        city: "Anglet",
                        zipCode: "64600",
                        country: "France",
                    },
                });
                billingAddressId = defaultAddress.id;
            }
        }

        const cart = await prisma.cart.findUnique({
            where: { id: cartId },
            include: { productsInCart: { include: { product: { select: { price: true } } } } },
        });

        if (!cart) {
            return NextResponse.json({ error: "Cart not found" }, { status: 404 });
        }

        if (cart.userId !== userId) {
            return NextResponse.json(
                { error: "This cart does not belong to the specified user" },
                { status: 403 }
            );
        }

        const total = cart.productsInCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

        const order = await prisma.$transaction(async (prisma) => {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { loyaltyNumber: true, loyaltyPoints: true },
            });
            const hasCard = !!user?.loyaltyNumber;

            if (requestedVouchers > 0 && (!hasCard || requestedVouchers > maxVouchers(user.loyaltyPoints, total))) {
                throw new InvalidVouchersError();
            }
            const loyaltyDiscount = requestedVouchers * VOUCHER_VALUE;
            const loyaltyPointsUsed = requestedVouchers * POINTS_PER_VOUCHER;
            const loyaltyPointsEarned = hasCard ? pointsForAmount(total - loyaltyDiscount) : 0;

            const newOrder = await prisma.order.create({
                data: {
                    userId,
                    cartId,
                    billingAddressId,
                    pickupSlot,
                    loyaltyDiscount,
                    loyaltyPointsUsed,
                    loyaltyPointsEarned,
                    validated: true,
                },
            });

            await prisma.cart.update({
                where: { id: cartId },
                data: { archived: true },
            });

            // Solde et historique de la Carte Trinity
            if (hasCard && (loyaltyPointsUsed > 0 || loyaltyPointsEarned > 0)) {
                const number = orderNumber(newOrder.id);
                await prisma.user.update({
                    where: { id: userId },
                    data: { loyaltyPoints: { increment: loyaltyPointsEarned - loyaltyPointsUsed } },
                });
                await prisma.loyaltyTransaction.createMany({
                    data: [
                        ...(loyaltyPointsUsed > 0
                            ? [{ userId, orderId: newOrder.id, points: -loyaltyPointsUsed, label: `Bon de réduction, commande n° ${number}` }]
                            : []),
                        ...(loyaltyPointsEarned > 0
                            ? [{ userId, orderId: newOrder.id, points: loyaltyPointsEarned, label: `Points gagnés, commande n° ${number}` }]
                            : []),
                    ],
                });
            }

            return newOrder;
        });

        return NextResponse.json({ data: order }, { status: 201 });
    } catch (error) {
        if (error instanceof InvalidVouchersError) {
            return NextResponse.json({ error: "Not enough loyalty points" }, { status: 400 });
        }
        if (error instanceof Error) {
            console.error("Error creating order:", error.message);
            return NextResponse.json(
                { error: "Internal Server Error", details: error.message },
                { status: 500 }
            );
        }

        console.error("Unknown error occurred:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: "An unknown error occurred" },
            { status: 500 }
        );
    }
}