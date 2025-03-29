import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const isLoggedIn = await isUserLoggedIn()
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401}
        );
    }

    const {id} = await params;
    if (!id) {
        return NextResponse.json({error: 'Product ID is required'}, {status: 400});
    }
    try {
        const getOrderById = await prisma.order.findUnique({
            where: {
                id: id,
            },
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
        if (!getOrderById) {
            return NextResponse.json({error: 'Product not found'}, {status: 404});
        }
        return NextResponse.json({data: getOrderById});
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const orderId = request.nextUrl.pathname.split("/").pop();

        if (!orderId) {
            return NextResponse.json({error: "Order ID is required"}, {status: 400});
        }

        const order = await prisma.order.findUnique({
            where: {id: orderId},
        });

        if (!order) {
            return NextResponse.json({error: "Order not found"}, {status: 404});
        }

        await prisma.$transaction(async (prisma) => {
            await prisma.order.delete({
                where: {id: orderId},
            });

            await prisma.cart.update({
                where: {id: order.cartId},
                data: {archived: false},
            });
        });

        return NextResponse.json(
            {message: "Order deleted and cart restored successfully"},
            {status: 200}
        );
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error creating order:", error.message);
            return NextResponse.json(
                {error: "Internal Server Error", details: error.message},
                {status: 500}
            );
        }

        console.error("Unknown error occurred:", error);
        return NextResponse.json(
            {error: "Internal Server Error", details: "An unknown error occurred"},
            {status: 500}
        );
    }
}