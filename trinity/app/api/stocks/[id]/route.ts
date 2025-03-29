import {NextRequest, NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";

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
        const getStockByProductId = await prisma.stock.findUnique({
            where: { productId: String(id) },
        });
        if (!getStockByProductId) {
            return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        }
        return NextResponse.json({ data: getStockByProductId });
    } catch (error) {
        console.error('Error fetching stock by ID:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        const deleteStockByProductId = await prisma.stock.delete({
            where: { productId: String(id) },
        });
        if (!deleteStockByProductId) {
            return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Stock deleted'  });
    } catch (error) {
        console.error('Error deleting stock:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        const body = await request.json();
        const { quantity } = body;
        if (!quantity) {
            return NextResponse.json(
                { error: 'Missing required fields: quantity' },
                { status: 400 }
            );
        }
        const updateStockByProductId = await prisma.stock.update({
            where: { productId: String(id) },
            data: {
                quantity,
            },
        });

        return NextResponse.json({ data: updateStockByProductId });
    } catch (error) {
        console.error('Error updating stock:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
