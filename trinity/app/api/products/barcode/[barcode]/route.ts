import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";

export async function GET(request: NextRequest, { params }: { params: Promise<{ barcode: bigint }> }) {
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
    try {
        const GetProductByBarcode = await prisma.product.findFirst({
            where: { barCode: barcode },
        });
        if (!GetProductByBarcode) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        const productData = JSON.parse(JSON.stringify(GetProductByBarcode, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        return NextResponse.json({ data: productData });
    } catch (error) {
        console.error('Error fetching product by barcode:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}