import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isUserLoggedIn } from "@/services/auth/IsUserLoggedIn";

// Fetch user cart
export async function GET(request: NextRequest) {
    const isLoggedIn = await isUserLoggedIn();
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const userId = request.nextUrl.pathname.split('/').pop();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Fetch the active (non-archived) cart
        const userCart = await prisma.cart.findFirst({
            where: { userId, archived: false },
            include: {
                productsInCart: {
                    select: {
                        productId: true,
                        quantity: true,
                    },
                },
            },
        });

        if (!userCart) {
            return NextResponse.json({ error: 'Cart not found for the user' }, { status: 404 });
        }

        return NextResponse.json({ data: userCart });
    } catch (error) {
        console.error('Error fetching user cart:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Add a product to the cart
export async function POST(request: NextRequest) {
    const isLoggedIn = await isUserLoggedIn();
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const userId = request.nextUrl.pathname.split('/').pop();
        const { productId, quantity } = await request.json();

        if (!userId || !productId || typeof quantity !== "number" || quantity <= 0) {
            return NextResponse.json(
                { error: "Invalid user ID, product ID, or quantity" },
                { status: 400 }
            );
        }

        // Find the active (non-archived) cart
        let existingCart = await prisma.cart.findFirst({
            where: {
                userId,
                archived: false,
            },
            include: { productsInCart: true },
        });

        // Create a new cart if none exists
        if (!existingCart) {
            const newCart = await prisma.cart.create({
                data: {
                    userId,
                    productsInCart: {
                        create: {
                            productId,
                            quantity,
                        },
                    },
                },
                include: { productsInCart: true },
            });

            return NextResponse.json({ data: newCart }, { status: 201 });
        }

        // Check if the product already exists in the cart
        const existingProductInCart = existingCart.productsInCart.find(
            (item) => item.productId === productId
        );

        // Update quantity if the product exists
        if (existingProductInCart) {
            const updatedCartProduct = await prisma.productInCart.update({
                where: { id: existingProductInCart.id },
                data: { quantity: existingProductInCart.quantity + quantity },
            });

            return NextResponse.json({ data: updatedCartProduct }, { status: 200 });
        } else {
            // Add a new product to the cart
            const newProductInCart = await prisma.productInCart.create({
                data: {
                    productId,
                    quantity,
                    cartId: existingCart.id,
                },
            });

            return NextResponse.json({ data: newProductInCart }, { status: 200 });
        }
    } catch (error) {
        console.error("Internal server error while adding a product to the cart:", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
