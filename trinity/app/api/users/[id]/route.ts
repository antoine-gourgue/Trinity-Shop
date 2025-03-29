import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    try {
        const GetUserByID = await prisma.user.findUnique({
            where: { id: String(id) },
        });
        if (!GetUserByID) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ data: GetUserByID });
    } catch (error) {
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
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    try {
        const DeleteUserByID = await prisma.user.delete({
            where: {
                id: String(id)
            }
        });
        if (!DeleteUserByID) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ data: DeleteUserByID });
    } catch (error) {
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
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    try {
        const body = await request.json();
        const { firstName, lastName, email, password } = body;
        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json(
                { error: 'Missing required fields: firstName, lastName, email, or password' },
                { status: 400 }
            );
        }
        const updatedUser = await prisma.user.update({
            where: { id: String(id) },
            data: {
                firstName,
                lastName,
                email,
                password,
            },
        });
        return NextResponse.json({ data: updatedUser });
    } catch (error) {
        console.error('Error updating users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}