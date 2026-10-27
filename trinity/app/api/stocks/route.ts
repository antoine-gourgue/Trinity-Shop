import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { STOCK_FIELDS } from '@/lib/stock';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { isAdmin } from "@/services/auth/guards";
import { z } from "zod";
import { optionalField, readJsonBody } from "@/lib/api";
import { bestBeforeIn, markdownWindow } from "@/lib/shelf-life";

// Stock d'un produit dans un magasin
const stockBodySchema = z.object({
    quantity: optionalField(z.number().int().min(0)),
    productId: optionalField(z.string().min(1)),
    storeId: optionalField(z.string().min(1)),
});

// Stock d'un magasin (?magasin=slug) : la liste du réseau entier compterait une ligne par magasin et par produit
export async function GET(request: NextRequest) {
    const isLoggedIn = await isUserLoggedIn()
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401}
        );
    }

    const store = request.nextUrl.searchParams.get("magasin");
    if (!store) {
        return NextResponse.json({ error: 'Store required: /api/stocks?magasin=<slug>' }, { status: 400 });
    }

    try {
        const stocks = await prisma.storeStock.findMany({ where: { store: { slug: store } }, select: STOCK_FIELDS });
        return NextResponse.json({ data: stocks });
    } catch (error) {
        console.error('Error fetching stocks:', error);
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

    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { quantity, productId, storeId } = (await readJsonBody(request, stockBodySchema)) ?? {};
        if (quantity === undefined || !productId || !storeId) {
            return NextResponse.json({ error: 'All fields (quantity, productId, storeId) are required' }, { status: 400 });
        }

        const product = await prisma.product.findUnique({ where: { id: productId }, select: { shelfLifeDays: true } });
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        // Le stock arrive comme un lot reçu aujourd'hui, à la date habituelle du produit
        const [createStock] = await prisma.$transaction([
            prisma.storeStock.create({
                data: { quantity, productId, storeId },
                select: STOCK_FIELDS,
            }),
            ...(quantity > 0
                ? [
                      prisma.stockLot.create({
                          data: {
                              storeId,
                              productId,
                              quantity,
                              initialQuantity: quantity,
                              bestBefore: bestBeforeIn(product.shelfLifeDays),
                              markdownDays: markdownWindow(product.shelfLifeDays),
                          },
                      }),
                  ]
                : []),
        ]);
        return NextResponse.json({ data: createStock }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
