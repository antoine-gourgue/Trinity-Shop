import prisma from "@/lib/prisma";
import {NextRequest, NextResponse} from "next/server";
import { createMocks } from "node-mocks-http";
import { GET, POST } from "@/app/api/orders/route";
import {IncomingMessage} from "node:http";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";

jest.mock("@/lib/prisma", () => ({
    order: {
        findMany: jest.fn(),
        create: jest.fn(),
    },
    cart: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback({
        order: {
            create: jest.fn(),
        },
        cart: {
            update: jest.fn(),
        },
    })),
}));

jest.mock("next/server", () => ({
    NextResponse: {
        json: jest.fn(),
    },
}));

jest.mock("@/services/auth/IsUserLoggedIn", () => ({
    isUserLoggedIn: jest.fn(),
}));

describe("GET /api/orders", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return all orders successfully", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockOrders = [
            {
                id: "order1",
                billingAddress: "123 Main St",
                user: { firstName: "John", lastName: "Doe" },
                cart: {
                    productsInCart: [
                        {
                            quantity: 2,
                            product: { id: "prod1", name: "Product 1", price: 100 },
                        },
                    ],
                },
            },
        ];

        (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

        const { req } = createMocks({ method: "GET", url: "/api/orders" });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as any);

        expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
        expect(jsonMock).toHaveBeenCalledWith({ data: mockOrders });
    });

    it("should return 500 if an error occurs", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockError = new Error("Database error");
        (prisma.order.findMany as jest.Mock).mockRejectedValue(mockError);

        const { req } = createMocks({ method: "GET", url: "/api/orders" });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as any);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    });

    it("should return 401 if user is not logged in", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

        const { req } = createMocks({ method: "GET", url: "/api/orders" });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as any);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Unauthorized" },
            { status: 401 }
        );
    });
});

describe("POST /api/orders", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should create a new order and archive the cart", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockCart = {
            id: "cart456",
            userId: "user123",
            productsInCart: [],
        };

        const mockOrder = {
            id: "order123",
            userId: "user123",
            cartId: "cart456",
            billingAddressId: "111111",
            validated: true,
        };

        (prisma.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);
        (prisma.order.create as jest.Mock).mockResolvedValue(mockOrder);
        (prisma.cart.update as jest.Mock).mockResolvedValue({ id: "cart456", archived: true });

        (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
            return await callback(prisma);
        });

        const { req } = createMocks({
            method: "POST",
            url: "/api/orders",
        });

        req.json = async () => ({
            userId: "user123",
            cartId: "cart456",
            billingAddressId: "111111",
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req as any);

        expect(prisma.cart.findUnique).toHaveBeenCalledWith({
            where: { id: "cart456" },
            include: { productsInCart: true },
        });

        expect(prisma.order.create).toHaveBeenCalledWith({
            data: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
                validated: true,
            },
        });

        expect(prisma.cart.update).toHaveBeenCalledWith({
            where: { id: "cart456" },
            data: { archived: true },
        });

        expect(jsonMock).toHaveBeenCalledWith({ data: mockOrder }, { status: 201 });
    });

    it("should return 400 if required fields are missing", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const { req } = createMocks({
            method: "POST",
            url: "/api/orders",
        });

        req.json = async () => ({
            userId: "",
            cartId: "",
            billingAddressId: "",
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req as any);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "User ID, Cart ID, and Billing Address are required" },
            { status: 400 }
        );
    });

    it("should return 404 if cart is not found", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.cart.findUnique as jest.Mock).mockResolvedValue(null);

        const { req } = createMocks({
            method: "POST",
            url: "/api/orders",
        });

        req.json = async () => ({
            userId: "user123",
            cartId: "cart456",
            billingAddressId: "111111",
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req as any);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Cart not found" },
            { status: 404 }
        );
    });

    it("should return 403 if the cart does not belong to the user", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockCart = {
            id: "cart456",
            userId: "user456",
            productsInCart: [],
        };

        (prisma.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);

        const { req } = createMocks({
            method: "POST",
            url: "/api/orders",
        });

        req.json = async () => ({
            userId: "user123",
            cartId: "cart456",
            billingAddressId: "111111",
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req as any);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "This cart does not belong to the specified user" },
            { status: 403 }
        );
    });

    it("should return 500 if an error occurs", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockError = new Error("Database error");

        (prisma.cart.findUnique as jest.Mock).mockRejectedValue(mockError);

        const { req } = createMocks({
            method: "POST",
            url: "/api/orders",
        });

        req.json = async () => ({
            userId: "user123",
            cartId: "cart456",
            billingAddressId: "111111",
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req as any);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error", details: "Database error" },
            { status: 500 }
        );
    });

    it("should return 500 with a generic message for unknown errors", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.cart.findUnique as jest.Mock).mockRejectedValue("Unknown error");

        const { req, res } = createMocks<IncomingMessage>({
            method: "POST",
            url: "/api/orders",
        });

        const body: { userId: string; cartId: string; billingAddressId: string } = {
            userId: "user123",
            cartId: "cart456",
            billingAddressId: "111111",
        };

        req.json = async () => body;

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req as unknown as NextRequest);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error", details: "An unknown error occurred" },
            { status: 500 }
        );
    });

    it("should return 401 if user is not logged in", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

        const mockCart = {
            id: "cart456",
            userId: "user123",
            productsInCart: [],
        };

        (prisma.cart.findUnique as jest.Mock).mockResolvedValue(mockCart);

        const { req } = createMocks({
            method: "POST",
            url: "/api/orders",
        });

        req.json = async () => ({
            userId: "user123",
            cartId: "cart456",
            billingAddressId: "111111",
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req as any);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Unauthorized" },
            { status: 401 }
        );

    });
});
