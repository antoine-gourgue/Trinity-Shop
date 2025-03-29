import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import createUserRepository from "@/services/auth/createUserRepository";
import {createUserSchema} from "@/schemas/createUserSchema";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";

export async function GET(request: NextRequest) {
    const isLoggedIn = await isUserLoggedIn()
    if (!isLoggedIn) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401}
        );
    }

    const users = await prisma.user.findMany();
    try {
        return NextResponse.json({data: users});
    } catch (error) {
        console.error('Error fetching carts:', error);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}

export async function POST(request: NextRequest) {
    try {
        const { firstName, lastName, email, password } = await request.json();
        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }
        const createdUser = {
            data: {
                firstName,
                lastName,
                email,
                password,
            },
        };
        const parsedUser = createUserSchema.safeParse(createdUser.data);
        if (parsedUser.success) {
            await createUserRepository(parsedUser.data);
        }
        return NextResponse.json({ data: createdUser }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}