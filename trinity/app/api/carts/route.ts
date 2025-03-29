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
        const carts = await prisma.cart.findMany({
            select: {
                id: true,
                userId: true,
                productsInCart: {
                    select: {
                        productId: true,
                        quantity: true,
                    }
                },
            },
        });
        return NextResponse.json({ data: carts });
    } catch (error) {
        console.error('Error fetching carts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
