/**
 * @jest-environment node
 */
import { GET as getUsers, POST as createUser } from '@/app/api/users/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isUserLoggedIn } from "@/services/auth/IsUserLoggedIn";
import { buildRequest } from '@/test-utils/requests';

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
        it('should return all users successfully', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockUsers = [
                { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: '123456', cart: [] },
            ];
            (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/users');

            await getUsers(req);

            expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
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

        it('should return 500 on database error', async () => {
            console.log('Mocking database error');
            const mockError = new Error('Database error');
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