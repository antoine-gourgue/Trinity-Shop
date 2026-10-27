/**
 * @jest-environment node
 */
import { Prisma } from '@prisma/client';
import { GET as getStoreStocks, POST as createStock } from '@/app/api/stocks/route';
import { GET as getProductStocks, PUT as updateStock, DELETE as deleteStock } from '@/app/api/stocks/[id]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { isAdmin } from "@/services/auth/guards";
import { STOCK_FIELDS } from '@/lib/stock';
import { buildRequest } from '@/test-utils/requests';

jest.mock('@/lib/prisma', () => ({
    storeStock: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
    },
}));

jest.mock('next/server', () => ({
    ...jest.requireActual<typeof import('next/server')>('next/server'),
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
}));

const NANTES_MILK = { id: 's1', productId: 'milk', quantity: 12, store: { slug: 'nantes-beaujoire', name: 'Trinity Nantes Beaujoire' } };
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe('API: /api/stocks', () => {
    beforeEach(() => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (isAdmin as jest.Mock).mockResolvedValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it("returns the stock of the requested store", async () => {
            (prisma.storeStock.findMany as jest.Mock).mockResolvedValue([NANTES_MILK]);

            await getStoreStocks(buildRequest('/api/stocks?magasin=nantes-beaujoire'));

            expect(prisma.storeStock.findMany).toHaveBeenCalledWith({ where: { store: { slug: 'nantes-beaujoire' } }, select: STOCK_FIELDS });
            expect(NextResponse.json).toHaveBeenCalledWith({ data: [NANTES_MILK] });
        });

        it("asks for a store instead of listing the whole network", async () => {
            await getStoreStocks(buildRequest('/api/stocks'));

            expect(prisma.storeStock.findMany).not.toHaveBeenCalled();
            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Store required: /api/stocks?magasin=<slug>' }, { status: 400 });
        });

        it('returns 401 if the user is not logged in', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

            await getStoreStocks(buildRequest('/api/stocks?magasin=nantes-beaujoire'));

            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
        });

        it('returns 500 on database error', async () => {
            (prisma.storeStock.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));
            jest.spyOn(console, 'error').mockImplementation(() => undefined);

            await getStoreStocks(buildRequest('/api/stocks?magasin=nantes-beaujoire'));

            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Internal Server Error' }, { status: 500 });
        });
    });

    describe('POST', () => {
        it('creates the stock of a product in a store', async () => {
            (prisma.storeStock.create as jest.Mock).mockResolvedValue(NANTES_MILK);

            await createStock(buildRequest('/api/stocks', { method: 'POST', body: { quantity: 12, productId: 'milk', storeId: 'store-nantes' } }));

            expect(prisma.storeStock.create).toHaveBeenCalledWith({
                data: { quantity: 12, productId: 'milk', storeId: 'store-nantes' },
                select: STOCK_FIELDS,
            });
            expect(NextResponse.json).toHaveBeenCalledWith({ data: NANTES_MILK }, { status: 201 });
        });

        it('requires the store', async () => {
            await createStock(buildRequest('/api/stocks', { method: 'POST', body: { quantity: 12, productId: 'milk' } }));

            expect(prisma.storeStock.create).not.toHaveBeenCalled();
            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'All fields (quantity, productId, storeId) are required' },
                { status: 400 }
            );
        });

        it('is reserved to administrators', async () => {
            (isAdmin as jest.Mock).mockResolvedValue(false);

            await createStock(buildRequest('/api/stocks', { method: 'POST', body: { quantity: 12, productId: 'milk', storeId: 'store-nantes' } }));

            expect(prisma.storeStock.create).not.toHaveBeenCalled();
            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' }, { status: 403 });
        });
    });
});

describe('API: /api/stocks/[id]', () => {
    beforeEach(() => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (isAdmin as jest.Mock).mockResolvedValue(true);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('returns the stock of the product in every store', async () => {
            (prisma.storeStock.findMany as jest.Mock).mockResolvedValue([NANTES_MILK]);

            await getProductStocks(buildRequest('/api/stocks/milk'), params('milk'));

            expect(prisma.storeStock.findMany).toHaveBeenCalledWith({
                where: { productId: 'milk' },
                select: STOCK_FIELDS,
                orderBy: { store: { name: 'asc' } },
            });
            expect(NextResponse.json).toHaveBeenCalledWith({ data: [NANTES_MILK] });
        });

        it('returns 404 for a product without stock', async () => {
            (prisma.storeStock.findMany as jest.Mock).mockResolvedValue([]);

            await getProductStocks(buildRequest('/api/stocks/milk'), params('milk'));

            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Stock not found' }, { status: 404 });
        });

        it('returns 401 if the user is not logged in', async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

            await getProductStocks(buildRequest('/api/stocks/milk'), params('milk'));

            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
        });
    });

    describe('PUT', () => {
        it('updates the stock of the product in one store', async () => {
            (prisma.storeStock.update as jest.Mock).mockResolvedValue({ ...NANTES_MILK, quantity: 40 });

            await updateStock(buildRequest('/api/stocks/milk', { method: 'PUT', body: { quantity: 40, storeId: 'store-nantes' } }), params('milk'));

            expect(prisma.storeStock.update).toHaveBeenCalledWith({
                where: { storeId_productId: { storeId: 'store-nantes', productId: 'milk' } },
                data: { quantity: 40 },
                select: STOCK_FIELDS,
            });
            expect(NextResponse.json).toHaveBeenCalledWith({ data: { ...NANTES_MILK, quantity: 40 } });
        });

        it('requires the quantity and the store', async () => {
            await updateStock(buildRequest('/api/stocks/milk', { method: 'PUT', body: { quantity: 40 } }), params('milk'));

            expect(prisma.storeStock.update).not.toHaveBeenCalled();
            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Missing required fields: quantity, storeId' }, { status: 400 });
        });

        it('returns 404 when the product has no stock in that store', async () => {
            (prisma.storeStock.update as jest.Mock).mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('Record not found', { code: 'P2025', clientVersion: 'test' })
            );

            await updateStock(buildRequest('/api/stocks/milk', { method: 'PUT', body: { quantity: 40, storeId: 'store-nantes' } }), params('milk'));

            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Stock not found' }, { status: 404 });
        });
    });

    describe('DELETE', () => {
        it('removes the stock of the product in every store', async () => {
            (prisma.storeStock.deleteMany as jest.Mock).mockResolvedValue({ count: 81 });

            await deleteStock(buildRequest('/api/stocks/milk', { method: 'DELETE' }), params('milk'));

            expect(prisma.storeStock.deleteMany).toHaveBeenCalledWith({ where: { productId: 'milk' } });
            expect(NextResponse.json).toHaveBeenCalledWith({ message: 'Stock deleted' });
        });

        it('returns 404 for a product without stock', async () => {
            (prisma.storeStock.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

            await deleteStock(buildRequest('/api/stocks/milk', { method: 'DELETE' }), params('milk'));

            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Stock not found' }, { status: 404 });
        });

        it('is reserved to administrators', async () => {
            (isAdmin as jest.Mock).mockResolvedValue(false);

            await deleteStock(buildRequest('/api/stocks/milk', { method: 'DELETE' }), params('milk'));

            expect(prisma.storeStock.deleteMany).not.toHaveBeenCalled();
            expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' }, { status: 403 });
        });
    });
});
