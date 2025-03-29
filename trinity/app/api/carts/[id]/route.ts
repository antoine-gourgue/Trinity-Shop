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
        const getCartById = await prisma.cart.findUnique({
            where: {
                id: id,
            },
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
        if (!getCartById) {
            return NextResponse.json({error: 'Product not found'}, {status: 404});
        }
        return NextResponse.json({data: getCartById});
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}