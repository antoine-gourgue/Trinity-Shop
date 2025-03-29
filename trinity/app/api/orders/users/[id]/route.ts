import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
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
        const id = request.nextUrl.pathname.split("/").pop();

        if (!id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const getOrderByUserId = await prisma.order.findMany({
            where: {
                userId: id,
            },
            select: {
                id: true,
                billingAddress: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
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
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!getOrderByUserId.length) {
            return NextResponse.json({ error: "Orders not found" }, { status: 404 });
        }

        return NextResponse.json({ data: getOrderByUserId }, { status: 200 });
    } catch (error) {
        console.error("Error fetching orders by user ID:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
