import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { isAdmin } from "@/services/auth/guards";
import { z } from "zod";
import { optionalField, readJsonBody } from "@/lib/api";

// Stock initial d'un produit
const stockBodySchema = z.object({
    quantity: optionalField(z.number().int().min(0)),
    productId: optionalField(z.string().min(1)),
});

export async function GET() {
    const isLoggedIn = await isUserLoggedIn()
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401}
        );
    }

    try {
        const stocks = await prisma.stock.findMany();
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
        const { quantity, productId } = (await readJsonBody(request, stockBodySchema)) ?? {};
        if (quantity === undefined || !productId) {
            return NextResponse.json({ error: 'All fields (quantity, productId) are required' }, { status: 400 });
        }

        const createStock = await prisma.stock.create({
            data: {
                quantity,
                productId
            },
        });
        return NextResponse.json({ data: createStock }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}