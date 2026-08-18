import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";

export async function GET(request: NextRequest) {
    const isLoggedIn = await isUserLoggedIn()
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401}
        );
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

        if (!userId || !cartId) {
            return NextResponse.json(
                { error: "User ID and Cart ID are required" },
                { status: 400 }
            );
        }

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
            include: { productsInCart: true },
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

        const order = await prisma.$transaction(async (prisma) => {
            const newOrder = await prisma.order.create({
                data: {
                    userId,
                    cartId,
                    billingAddressId,
                    validated: true,
                },
            });

            await prisma.cart.update({
                where: { id: cartId },
                data: { archived: true },
            });

            return newOrder;
        });

        return NextResponse.json({ data: order }, { status: 201 });
    } catch (error) {
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