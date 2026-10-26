import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { canAccessUser } from "@/services/auth/guards";
import bcrypt from "bcrypt";
import { z } from "zod";
import { optionalField, readJsonBody } from "@/lib/api";
import { PUBLIC_USER } from "@/lib/public-user";

// Modification d'un compte : tous les champs sont requis
const userUpdateSchema = z.object({
    firstName: optionalField(z.string().min(1)),
    lastName: optionalField(z.string().min(1)),
    email: optionalField(z.string().min(1)),
    password: optionalField(z.string().min(1)),
});

const FORBIDDEN = { error: "Forbidden" };

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    if (!(await canAccessUser(id))) {
        return NextResponse.json(FORBIDDEN, { status: 403 });
    }
    try {
        const GetUserByID = await prisma.user.findUnique({
            where: { id: String(id) },
            select: PUBLIC_USER,
        });
        if (!GetUserByID) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ data: GetUserByID });
    } catch {
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
    if (!(await canAccessUser(id))) {
        return NextResponse.json(FORBIDDEN, { status: 403 });
    }
    try {
        const DeleteUserByID = await prisma.user.delete({
            where: {
                id: String(id)
            },
            select: PUBLIC_USER,
        });
        if (!DeleteUserByID) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ data: DeleteUserByID });
    } catch {
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
    if (!(await canAccessUser(id))) {
        return NextResponse.json(FORBIDDEN, { status: 403 });
    }
    try {
        const { firstName, lastName, email, password } = (await readJsonBody(request, userUpdateSchema)) ?? {};
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
                password: await bcrypt.hash(password, 10),
            },
            select: PUBLIC_USER,
        });
        return NextResponse.json({ data: updatedUser });
    } catch (error) {
        console.error('Error updating users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}