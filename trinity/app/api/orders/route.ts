import prisma from "@/lib/prisma";
import { NextRequest, NextResponse, after } from 'next/server';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { isAdmin } from "@/services/auth/guards";
import { parseSlotParam, slotToDate } from "@/lib/checkout";
import { auth } from "@/auth";
import { placeOrder, type PlaceOrderError } from "@/lib/orders/place-order";
import { z } from "zod";
import { optionalField, readJsonBody } from "@/lib/api";
import { sendOrderConfirmation } from "@/lib/order-emails";
import { storeForOrder } from "@/lib/stores";

// Commande envoyée par le tunnel ; un champ du mauvais type compte comme absent
const orderBodySchema = z.object({
    userId: optionalField(z.string().min(1)),
    cartId: optionalField(z.string().min(1)),
    billingAddressId: optionalField(z.string().min(1)),
    // Créneau « 2026-10-28_18 » : une valeur qui n'est pas une chaîne est refusée comme un créneau invalide
    pickupSlot: z.unknown(),
    fulfillment: optionalField(z.enum(["pickup", "delivery"])),
    shippingAddressId: optionalField(z.string().min(1)),
    loyaltyVouchers: optionalField(z.number().int()),
});

// Refus du passage de commande, traduits en réponses de l'API
function orderErrorResponse(error: PlaceOrderError) {
    switch (error.code) {
        case "store_required":
            return NextResponse.json({ error: "Store required" }, { status: 400 });
        case "invalid_delivery_address":
            return NextResponse.json({ error: "Invalid delivery address" }, { status: 400 });
        case "cart_not_found":
            return NextResponse.json({ error: "Cart not found" }, { status: 404 });
        case "cart_forbidden":
            return NextResponse.json({ error: "This cart does not belong to the specified user" }, { status: 403 });
        case "cart_empty":
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        case "not_enough_points":
            return NextResponse.json({ error: "Not enough loyalty points" }, { status: 400 });
        case "slot_full":
            return NextResponse.json({ error: "Pickup slot full" }, { status: 409 });
        case "out_of_stock":
            return NextResponse.json({ error: "Out of stock", products: error.products }, { status: 409 });
    }
}

export async function GET() {
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
        const body = await readJsonBody(request, orderBodySchema);
        if (!body) {
            return NextResponse.json({ error: "Invalid order" }, { status: 400 });
        }
        const { userId, cartId } = body;

        // Créneau de retrait facultatif (« 2026-10-28_18 ») : accepté seulement s'il est à venir
        const slot = typeof body.pickupSlot === "string" ? parseSlotParam(body.pickupSlot) : null;
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

        const result = await placeOrder({
            userId,
            cartId,
            billingAddressId: body.billingAddressId,
            pickupSlot,
            // Magasin du compte, ou celui choisi avant la connexion
            storeId: await storeForOrder(userId),
            // Livraison à domicile : l'adresse doit appartenir au client (les frais sont calculés à l'affichage)
            delivery: body.fulfillment === "delivery" ? { shippingAddressId: body.shippingAddressId } : null,
            // Bons Carte Trinity demandés (100 points = 5 €), vérifiés dans la transaction
            loyaltyVouchers: body.loyaltyVouchers ?? 0,
        });
        if (!result.ok) return orderErrorResponse(result.error);

        // E-mail de confirmation envoyé après la réponse, sans retarder la commande
        after(() => sendOrderConfirmation(result.order.id));

        return NextResponse.json({ data: result.order }, { status: 201 });
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