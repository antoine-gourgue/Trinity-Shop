import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
        const GetProductByID = await prisma.product.findUnique({
            where: { id: String(id) },
        });
        if (!GetProductByID) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        const productData = JSON.parse(JSON.stringify(GetProductByID, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        return NextResponse.json({ data: productData });
    } catch (error) {
        console.error('Error fetching products by ID:', error);
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
        const deletedProduct = await prisma.product.delete({
            where: { id: String(id) },
        });
        if (!deletedProduct) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Product deleted'  });
    } catch (error) {
        console.error('Error deleting products:', error);
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
        const { name, price, description, nutriScore, brandId, categoryId } = body;
        if (!name || !price || !description || !nutriScore) {
            return NextResponse.json(
                { error: 'Missing required fields: name, price, description, or nutriScore' },
                { status: 400 }
            );
        }
        const updatedProduct = await prisma.product.update({
            where: { id: String(id) },
            data: {
                name,
                price,
                description,
                nutriScore,
                brandId,
                categories: categoryId,
            },
        });
        const productData = JSON.parse(JSON.stringify(updatedProduct, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        return NextResponse.json({ data: productData }, { status: 200 });
    } catch (error) {
        console.error('Error updating products:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


