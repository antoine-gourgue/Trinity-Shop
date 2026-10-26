import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import createUserRepository from "@/services/auth/createUserRepository";
import {createUserSchema} from "@/schemas/createUserSchema";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { isAdmin } from "@/services/auth/guards";
import { z } from "zod";
import { optionalField, readJsonBody } from "@/lib/api";
import { PUBLIC_USER } from "@/lib/public-user";
import { EmailAlreadyUsed } from "@/services/auth/errors";
import { RATE_LIMITS, clientIp, hitRateLimit } from "@/lib/rate-limit";

// Inscription : le détail des règles (e-mail, longueur du mot de passe) est vérifié par createUserSchema
const signupBodySchema = z.object({
    firstName: optionalField(z.string().min(1)),
    lastName: optionalField(z.string().min(1)),
    email: optionalField(z.string().min(1)),
    password: optionalField(z.string().min(1)),
});

export async function GET() {
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
        // Jamais le mot de passe, même pour un administrateur
        const users = await prisma.user.findMany({ select: PUBLIC_USER });
        return NextResponse.json({data: users});
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}

export async function POST(request: NextRequest) {
    const body = (await readJsonBody(request, signupBodySchema)) ?? {};
    if (!body.firstName || !body.lastName || !body.email || !body.password) {
        return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Mêmes règles que le formulaire d'inscription : un refus n'est jamais présenté comme une création
    const parsedUser = createUserSchema.safeParse(body);
    if (!parsedUser.success) {
        const message = parsedUser.error.issues[0]?.message ?? 'Invalid signup data';
        return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!(await hitRateLimit(`signup-ip:${clientIp(request.headers)}`, RATE_LIMITS.signupIp))) {
        return NextResponse.json({ error: 'Too many signups, try again later' }, { status: 429 });
    }

    try {
        const user = await createUserRepository(parsedUser.data);
        // Le compte créé, sans le mot de passe
        return NextResponse.json(
            { data: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof EmailAlreadyUsed) {
            return NextResponse.json({ error: 'Email already used' }, { status: 409 });
        }
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}