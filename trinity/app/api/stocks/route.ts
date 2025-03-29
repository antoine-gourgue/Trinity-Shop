import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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

    try {
        const { quantity, productId } = await request.json();
        if (!quantity || !productId) {
            return NextResponse.json({ error: 'All fields (quantity, productId) are required' }, { status: 400 });
        }

        const createStock = await prisma.stock.create({
            // @ts-ignore
            data: {
                quantity,
                productId
            },
        });
        return NextResponse.json({ data: createStock }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}