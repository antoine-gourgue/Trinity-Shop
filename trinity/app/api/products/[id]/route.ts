import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { nutriScore as NutriScore } from "@prisma/client";
import prisma from '@/lib/prisma';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { isAdmin } from "@/services/auth/guards";
import { optionalField, readJsonBody, toJson } from "@/lib/api";

// Modification d'un produit : la marque et la catégorie sont facultatives
const productUpdateSchema = z.object({
    name: optionalField(z.string().min(1)),
    price: optionalField(z.number().int().positive()),
    description: optionalField(z.string().min(1)),
    nutriScore: optionalField(z.nativeEnum(NutriScore)),
    brandId: optionalField(z.string().min(1)),
    categoryId: optionalField(z.string().min(1)),
});

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
        return NextResponse.json({ data: toJson(GetProductByID) });
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

    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    try {
        const body = await readJsonBody(request, productUpdateSchema);
        const { name, price, description, nutriScore, brandId, categoryId } = body ?? {};
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
                ...(brandId && { brandId }),
                // La catégorie envoyée remplace les précédentes
                ...(categoryId && {
                    categories: { deleteMany: {}, create: { category: { connect: { id: categoryId } } } },
                }),
            },
        });
        return NextResponse.json({ data: toJson(updatedProduct) }, { status: 200 });
    } catch (error) {
        console.error('Error updating products:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


