/**
 * @jest-environment node
 */
import { GET as getUsers, POST as createUser } from '@/app/api/users/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isUserLoggedIn } from "@/services/auth/IsUserLoggedIn";
import { buildRequest } from '@/test-utils/requests';
import { PUBLIC_USER } from '@/lib/public-user';
import { hitRateLimit } from '@/lib/rate-limit';

jest.mock('@/lib/prisma', () => ({
    user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn(),
    },
}));

jest.mock('@/services/auth/IsUserLoggedIn', () => ({
    isUserLoggedIn: jest.fn(),
}));

// Contrôles d'accès simulés : autorisés par défaut, chaque test peut les refuser
jest.mock("@/services/auth/guards", () => ({
    isAdmin: jest.fn().mockResolvedValue(true),
    canAccessUser: jest.fn().mockResolvedValue(true),
    canAccessOrder: jest.fn().mockResolvedValue(true),
    canAccessCart: jest.fn().mockResolvedValue(true),
}));

// Limitation des inscriptions : autorisée par défaut, un test la déclenche
jest.mock('@/lib/rate-limit', () => ({
    ...jest.requireActual<typeof import('@/lib/rate-limit')>('@/lib/rate-limit'),
    hitRateLimit: jest.fn().mockResolvedValue(true),
}));

jest.mock('resend', () => ({
    Resend: jest.fn(),
}));

jest.mock('@react-email/components', () => ({
    Email: jest.fn(),
}));

describe('API: /api/users', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('should return all users without their password', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockUsers = [
                { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            ];
            (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

            const jsonMock = jest.spyOn(NextResponse, 'json');

            await getUsers();

            expect(prisma.user.findMany).toHaveBeenCalledWith({ select: PUBLIC_USER });
            expect(PUBLIC_USER).not.toHaveProperty('password');
            expect(jsonMock).toHaveBeenCalledWith({ data: mockUsers });
        });
    });

    describe('POST', () => {

        it('should return 400 if required fields are missing', async () => {
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/users', { method: 'POST', body: { firstName: 'Incomplete' } });

            await createUser(req);

            expect(prisma.user.create).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'All fields are required' },
                { status: 400 }
            );
        });

        it('should return 400 with the reason if the data is invalid', async () => {
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/users', {
                method: 'POST',
                body: { firstName: 'Jane', lastName: 'Doe', email: 'not-an-email', password: 'password123' },
            });

            await createUser(req);

            expect(prisma.user.create).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Adresse e-mail invalide.' }, { status: 400 });
        });

        it('should return the created account without the password', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.user.create as jest.Mock).mockResolvedValue({
                id: 'new-user',
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane@example.com',
                role: 'Customer',
            });
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/users', {
                method: 'POST',
                body: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password: 'password123' },
            });

            await createUser(req);

            expect(jsonMock).toHaveBeenCalledWith(
                { data: { id: 'new-user', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' } },
                { status: 201 }
            );
            expect(JSON.stringify(jsonMock.mock.calls)).not.toContain('password123');
        });

        it('should return 429 when too many accounts are created from the same address', async () => {
            (hitRateLimit as jest.Mock).mockResolvedValueOnce(false);
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/users', {
                method: 'POST',
                body: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password: 'password123' },
            });

            await createUser(req);

            expect(prisma.user.create).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Too many signups, try again later' }, { status: 429 });
        });

        it('should return 409 if the email is already used', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/users', {
                method: 'POST',
                body: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password: 'password123' },
            });

            await createUser(req);

            expect(prisma.user.create).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Email already used' }, { status: 409 });
        });

        it('should return 500 on database error', async () => {
            console.log('Mocking database error');
            const mockError = new Error('Database error');
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.user.create as jest.Mock).mockRejectedValue(mockError);

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/users', {
                method: 'POST',
                body: {
                    firstName: 'Jane',
                    lastName: 'Doe',
                    email: 'jane@example.com',
                    password: 'password123',
                    cart: [],
                },
            });

            console.log('Calling createUser function');
            try {
                await createUser(req);
            } catch (error) {
                if (error instanceof Error) {
                    console.log('Error caught:', error.message);
                } else {
                    console.log('Unknown error type caught');
                }
            }

            console.log('Verifying expectations');
            expect(prisma.user.create).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Internal Server Error' },
                { status: 500 }
            );
        });
    });
});