import { GET as getUsers, POST as createUser } from '@/app/api/users/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { isUserLoggedIn } from "@/services/auth/IsUserLoggedIn";

jest.mock('@/lib/prisma', () => ({
    user: {
        findMany: jest.fn(),
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
            const { req } = createMocks({ method: 'GET' });

            await getUsers(req as any);

            expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith({ data: mockUsers });
        });
    });

    describe('POST', () => {

        it('should return 400 if required fields are missing', async () => {
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const { req } = createMocks({ method: 'POST' });
            req.body = JSON.stringify({ firstName: 'Incomplete' });

            req.json = async () => JSON.parse(req.body);

            await createUser(req as any);

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
            const { req } = createMocks({ method: 'POST' });
            req.body = JSON.stringify({
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane@example.com',
                password: 'password123',
                cart: [],
            });

            req.json = async () => JSON.parse(req.body);

            console.log('Calling createUser function');
            try {
                await createUser(req as any);
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