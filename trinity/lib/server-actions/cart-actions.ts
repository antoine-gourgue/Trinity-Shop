"use server";

import prisma from "@/lib/prisma";
import { getUser } from "@/services/auth/getUserByEmail";
import {auth} from "@/auth";

export async function addToCart(productId: string, quantity: number) {
    try {
        const user = await getUser();

        if (!user || !user.id) {
            console.error("Attempt to add to cart without a logged-in user.");
            return { error: "User not logged in", message: "Please log in to add items to the cart." };
        }

        const userId = user.id;

        let cart = await prisma.cart.findFirst({
            where: {
                userId,
                archived: false,
            },
            include: { productsInCart: true },
        });

        if (!cart) {
            cart = await prisma.cart.create({
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

            return { success: true, message: "Product successfully added to a new cart." };
        }

        const existingProductInCart = cart.productsInCart.find((item) => item.productId === productId);

        if (existingProductInCart) {
            await prisma.productInCart.update({
                where: { id: existingProductInCart.id },
                data: { quantity: existingProductInCart.quantity + quantity },
            });

            return { success: true, message: "Quantity updated in the cart." };
        } else {
            await prisma.productInCart.create({
                data: {
                    productId,
                    quantity,
                    cartId: cart.id,
                },
            });

            return { success: true, message: "Product added to the cart." };
        }
    } catch (error) {
        console.error("Internal server error while adding a product to the cart", error);
        return { error: "Server error", message: "An error occurred, please try again." };
    }
}

export async function getCartProducts() {
    try {
        const user = await getUser();

        if (!user || !user.id) {
            console.error("Attempt to fetch cart without a logged-in user.");
            return {
                error: "User not logged in",
                message: "Please log in to view your cart.",
            };
        }

        const userId = user.id;

        const cart = await prisma.cart.findFirst({
            where: {
                userId,
                archived: false,
            },
            include: {
                productsInCart: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                picture: true,
                            },
                        },
                    },
                },
            },
        });

        if (!cart || cart.productsInCart.length === 0) {
            return {
                success: true,
                message: "Your cart is empty.",
                products: [],
            };
        }

        const cartProducts = cart.productsInCart.map((item) => ({
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            picture: item.product.picture,
            quantity: item.quantity,
        }));

        return { success: true, cartId: cart.id, products: cartProducts };
    } catch (error) {
        console.error("Internal server error while fetching cart products", error);
        return {
            error: "Server error",
            message: "An error occurred, please try again.",
        };
    }
}

export async function removeProductFromCart(productId: string) {
    try {
        const user = await getUser();

        if (!user || !user.id) {
            console.error("Attempt to remove a product without a logged-in user.");
            return {
                error: "User not logged in",
                message: "Please log in to view your cart.",
            };
        }

        const userId = user.id;

        const cart = await prisma.cart.findFirst({
            where: {
                userId,
                archived: false,
            },
            include: {
                productsInCart: {
                    where: { productId },
                },
            },
        });

        if (!cart || cart.productsInCart.length === 0) {
            return {
                error: "Product not found",
                message: "The product is not in your cart.",
            };
        }

        await prisma.productInCart.delete({
            where: { id: cart.productsInCart[0].id },
        });

        return {
            success: true,
            message: "Product successfully removed from the cart.",
        };
    } catch (error) {
        console.error("Internal server error while removing a product from the cart", error);
        return {
            error: "Server error",
            message: "An error occurred, please try again.",
        };
    }
}

export async function updateProductQuantityInCart(productId: string, quantity: number) {
    try {
        const user = await getUser();

        if (!user || !user.id) {
            console.error("Attempt to update cart without a logged-in user.");
            return {
                error: "User not logged in",
                message: "Please log in to view your cart.",
            };
        }

        const userId = user.id;

        const cart = await prisma.cart.findFirst({
            where: {
                userId,
                archived: false,
            },
            include: {
                productsInCart: {
                    where: { productId },
                },
            },
        });

        if (!cart || cart.productsInCart.length === 0) {
            return {
                error: "Product not found",
                message: "The product is not in your cart.",
            };
        }

        await prisma.productInCart.update({
            where: { id: cart.productsInCart[0].id },
            data: { quantity },
        });

        return {
            success: true,
            message: "Product quantity successfully updated in the cart.",
        };
    } catch (error) {
        console.error("Internal server error while updating product quantity in the cart", error);
        return {
            error: "Server error",
            message: "An error occurred, please try again.",
        };
    }
}


export async function getActiveCartId() {
    const session = await auth();

    if (!session?.user?.id) {
        return { error: "Utilisateur non authentifié." };
    }

    try {
        const cart = await prisma.cart.findFirst({
            where: {
                userId: session.user.id,
                archived: false,
            },
            select: { id: true },
        });

        if (!cart) {
            return { error: "Aucun panier actif trouvé." };
        }

        return { cartId: cart.id };
    } catch (error) {
        console.error("Erreur lors de la récupération du cartId :", error);
        return { error: "Erreur serveur lors de la récupération du panier." };
    }
}

