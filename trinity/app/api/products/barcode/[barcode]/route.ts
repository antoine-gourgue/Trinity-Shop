import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { toJson } from "@/lib/api";
import { isBarcode } from "@/lib/barcode";

export async function GET(request: NextRequest, { params }: { params: Promise<{ barcode: string }> }) {
    const isLoggedIn = await isUserLoggedIn()
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401}
        );
    }

    const { barcode } = await params;
    if (!barcode) {
        return NextResponse.json({ error: 'Product barcode is required' }, { status: 400 });
    }
    // Code GTIN : évite aussi un BigInt invalide ou hors limites
    if (!isBarcode(barcode)) {
        return NextResponse.json({ error: 'Invalid product barcode' }, { status: 400 });
    }
    try {
        const GetProductByBarcode = await prisma.product.findFirst({
            where: { barCode: BigInt(barcode) },
        });
        if (!GetProductByBarcode) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        return NextResponse.json({ data: toJson(GetProductByBarcode) });
    } catch (error) {
        console.error('Error fetching product by barcode:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}