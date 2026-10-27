import {NextRequest, NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import { setStockQuantity } from "@/lib/stock-lots";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { isAdmin } from "@/services/auth/guards";
import { z } from "zod";
import { optionalField, readJsonBody } from "@/lib/api";
import { STOCK_FIELDS } from "@/lib/stock";

// Nouvelle quantité d'un produit dans un magasin (0 = rupture)
const stockUpdateSchema = z.object({
    quantity: optionalField(z.number().int().min(0)),
    storeId: optionalField(z.string().min(1)),
});

// Stock du produit dans chaque magasin
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const isLoggedIn = await isUserLoggedIn()
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401}
        );
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    try {
        const stocks = await prisma.storeStock.findMany({
            where: { productId: id },
            select: STOCK_FIELDS,
            orderBy: { store: { name: "asc" } },
        });
        if (stocks.length === 0) {
            return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        }
        return NextResponse.json({ data: stocks });
    } catch (error) {
        console.error('Error fetching stock by ID:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Supprime le stock du produit dans tous les magasins
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    try {
        // Les lots du produit partent avec son stock
        const [, { count }] = await prisma.$transaction([
            prisma.stockLot.deleteMany({ where: { productId: id } }),
            prisma.storeStock.deleteMany({ where: { productId: id } }),
        ]);
        if (count === 0) {
            return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Stock deleted' });
    } catch (error) {
        console.error('Error deleting stock:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Met à jour le stock du produit dans un magasin
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    try {
        const { quantity, storeId } = (await readJsonBody(request, stockUpdateSchema)) ?? {};
        if (quantity === undefined || !storeId) {
            return NextResponse.json(
                { error: 'Missing required fields: quantity, storeId' },
                { status: 400 }
            );
        }
        const where = { storeId_productId: { storeId, productId: id } };
        const stock = await prisma.storeStock.findUnique({ where, select: { product: { select: { shelfLifeDays: true } } } });
        // Le produit n'a pas de stock dans ce magasin
        if (!stock) {
            return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        }
        // Les lots suivent : unités retirées des dates les plus courtes, ou lot ajouté
        await prisma.$transaction((tx) => setStockQuantity(tx, { storeId, productId: id, quantity, shelfLife: stock.product.shelfLifeDays }));
        const updated = await prisma.storeStock.findUnique({ where, select: STOCK_FIELDS });

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error('Error updating stock:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
