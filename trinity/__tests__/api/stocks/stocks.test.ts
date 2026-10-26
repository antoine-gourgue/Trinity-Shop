/**
 * @jest-environment node
 */
import { GET as getAllStocks, POST as createStock } from '@/app/api/stocks/route';
import { GET as getStockById, PUT as updateStock, DELETE as deleteStock } from '@/app/api/stocks/[id]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { buildRequest } from '@/test-utils/requests';

jest.mock('@/lib/prisma', () => ({
    stock: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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

describe('API: /api/stocks', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('should return all stocks successfully', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockStocks = [{ productId: '1', quantity: 100 }];
            (prisma.stock.findMany as jest.Mock).mockResolvedValue(mockStocks);

            const jsonMock = jest.spyOn(NextResponse, 'json');

            await getAllStocks();

            expect(prisma.stock.findMany).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith({ data: mockStocks });
        });

        it('should return 500 on database error', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockError = new Error('Database error');
            (prisma.stock.findMany as jest.Mock).mockRejectedValueOnce(mockError);

            const jsonMock = jest.spyOn(NextResponse, 'json');

            await getAllStocks();

            expect(prisma.stock.findMany).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Internal Server Error' },
                { status: 500 }
            );
        });

        it('should return 401 if user is not logged in', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            const jsonMock = jest.spyOn(NextResponse, 'json');

            await getAllStocks();

            expect(prisma.stock.findMany).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        });
    });

    describe('POST', () => {
        it('should create a stock with valid data', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockStock = { productId: '1', quantity: 100 };
            (prisma.stock.create as jest.Mock).mockResolvedValue(mockStock);

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks', { method: 'POST', body: { quantity: 100, productId: '1' } });

            await createStock(req);

            expect(prisma.stock.create).toHaveBeenCalledWith({
                data: { quantity: 100, productId: '1' },
            });
            expect(jsonMock).toHaveBeenCalledWith({ data: mockStock }, { status: 201 });
        });

        it('should return 400 if required fields are missing', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks', { method: 'POST', body: { quantity: 100 } });

            await createStock(req);

            expect(prisma.stock.create).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'All fields (quantity, productId) are required' },
                { status: 400 }
            );
        });

        it('should return 500 on database error', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (prisma.stock.create as jest.Mock).mockRejectedValue(new Error('Database error'));

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks', { method: 'POST', body: { quantity: 100, productId: '1' } });

            await createStock(req);

            expect(prisma.stock.create).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal Server Error' }, { status: 500 });
        });

        it('should return 401 if user is not logged in', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            const req = buildRequest('/api/stocks', { method: 'POST' });
            const jsonMock = jest.spyOn(NextResponse, 'json');

            await createStock(req);

            expect(prisma.stock.create).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        });
    });
});

describe('API: /api/stocks/[id]', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('should return a stock by product ID', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockStock = { productId: '1', quantity: 100 };
            (prisma.stock.findUnique as jest.Mock).mockResolvedValue(mockStock);

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/1');
            const params = { id: '1' };

            await getStockById(req, { params: Promise.resolve(params) });

            expect(prisma.stock.findUnique).toHaveBeenCalledWith({ where: { productId: '1' } });
            expect(jsonMock).toHaveBeenCalledWith({ data: mockStock });
        });

        it('should return 404 if stock is not found', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (prisma.stock.findUnique as jest.Mock).mockResolvedValue(null);

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/1');
            const params = { id: '1' };

            await getStockById(req, { params: Promise.resolve(params) });

            expect(prisma.stock.findUnique).toHaveBeenCalledWith({ where: { productId: '1' } });
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Stock not found' },
                { status: 404 }
            );
        });

        it('should return 400 if product ID is missing', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/');
            const params = { id: '' }; // identifiant absent

            await getStockById(req, { params: Promise.resolve(params) });

            expect(prisma.stock.findUnique).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Product ID is required' },
                { status: 400 }
            );
        });

        it('should return 500 on database error', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (prisma.stock.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/1');
            const params = { id: '1' };

            await getStockById(req, { params: Promise.resolve(params) });

            expect(prisma.stock.findUnique).toHaveBeenCalledWith({ where: { productId: '1' } });
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal Server Error' }, { status: 500 });
        });

        it('should return 401 if user is not logged in', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            const req = buildRequest('/api/stocks/1');
            const jsonMock = jest.spyOn(NextResponse, 'json');

            await getStockById(req, { params: Promise.resolve({ id: '1' }) });

            expect(prisma.stock.findUnique).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        });
    });

    describe('PUT', () => {
        it('should update a stock by product ID', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockStock = { productId: '1', quantity: 200 };
            (prisma.stock.update as jest.Mock).mockResolvedValue(mockStock);

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/1', { method: 'PUT', body: { quantity: 200 } });
            const params = { id: '1' };

            await updateStock(req, { params: Promise.resolve(params) });

            expect(prisma.stock.update).toHaveBeenCalledWith({
                where: { productId: '1' },
                data: { quantity: 200 },
            });
            expect(jsonMock).toHaveBeenCalledWith({ data: mockStock });
        });

        it('should return 400 if quantity is missing', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/1', { method: 'PUT', body: {} });
            const params = { id: '1' };

            await updateStock(req, { params: Promise.resolve(params) });

            expect(prisma.stock.update).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Missing required fields: quantity' },
                { status: 400 }
            );
        });

        it('should return 400 if product ID is missing', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/', { method: 'PUT', body: { quantity: 200 } });
            const params = { id: '' }; // identifiant absent

            await updateStock(req, { params: Promise.resolve(params) });

            expect(prisma.stock.update).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Product ID is required' },
                { status: 400 }
            );
        });

        it('should return 500 on database error', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (prisma.stock.update as jest.Mock).mockRejectedValue(new Error('Database error'));

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/1', { method: 'PUT', body: { quantity: 200 } });
            const params = { id: '1' };

            await updateStock(req, { params: Promise.resolve(params) });

            expect(prisma.stock.update).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal Server Error' }, { status: 500 });
        });

        it('should return 401 if user is not logged in', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            const req = buildRequest('/api/stocks/1', { method: 'PUT' });
            const jsonMock = jest.spyOn(NextResponse, 'json');

            await updateStock(req, { params: Promise.resolve({ id: '1' }) });

            expect(prisma.stock.update).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        });
    });

    describe('DELETE', () => {
        it('should delete a stock by product ID', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockStock = { productId: '1', quantity: 100 };
            (prisma.stock.delete as jest.Mock).mockResolvedValue(mockStock);

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/1', { method: 'DELETE' });
            const params = { id: '1' };

            await deleteStock(req, { params: Promise.resolve(params) });

            expect(prisma.stock.delete).toHaveBeenCalledWith({ where: { productId: '1' } });
            expect(jsonMock).toHaveBeenCalledWith({ message: 'Stock deleted' });
        });

        it('should return 404 if stock is not found', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (prisma.stock.delete as jest.Mock).mockResolvedValue(null);

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/2', { method: 'DELETE' });
            const params = { id: '2' };

            await deleteStock(req, { params: Promise.resolve(params) });

            expect(prisma.stock.delete).toHaveBeenCalledWith({ where: { productId: '2' } });
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Stock not found' },
                { status: 404 }
            );
        });

        it('should return 400 if product ID is missing', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/', { method: 'DELETE' });
            const params = { id: '' }; // identifiant absent

            await deleteStock(req, { params: Promise.resolve(params) });

            expect(prisma.stock.delete).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Product ID is required' },
                { status: 400 }
            );
        });

        it('should return 500 on database error', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (prisma.stock.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

            const jsonMock = jest.spyOn(NextResponse, 'json');
            const req = buildRequest('/api/stocks/1', { method: 'DELETE' });
            const params = { id: '1' };

            await deleteStock(req, { params: Promise.resolve(params) });

            expect(prisma.stock.delete).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal Server Error' }, { status: 500 });
        });

        it('should return 401 if user is not logged in', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            const req = buildRequest('/api/stocks/1', { method: 'DELETE' });
            const jsonMock = jest.spyOn(NextResponse, 'json');

            await deleteStock(req, { params: Promise.resolve({ id: '1' }) });

            expect(prisma.stock.delete).not.toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        });
    });
});

