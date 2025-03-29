import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { GET, DELETE } from "@/app/api/orders/[id]/route";
import { createMocks } from "node-mocks-http";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";

jest.mock("@/lib/prisma", () => ({
    order: {
        findUnique: jest.fn(),
        delete: jest.fn(),
    },
    cart: {
        update: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback({
        order: { delete: jest.fn() },
        cart: { update: jest.fn() },
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


describe("GET /api/orders/[id]", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return the order by ID if it exists", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockOrder = {
            id: "order123",
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
        };

        (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

        const { req } = createMocks({ method: "GET", url: "/api/orders/order123" });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest, { params: Promise.resolve({ id: "order123" }) });

        expect(prisma.order.findUnique).toHaveBeenCalledWith({
            where: { id: "order123" },
            select: {
                id: true,
                billingAddress: true,
                user: { select: { firstName: true, lastName: true } },
                cart: {
                    select: {
                        productsInCart: {
                            select: {
                                quantity: true,
                                product: { select: { id: true, name: true, price: true } },
                            },
                        },
                    },
                },
            },
        });

        expect(jsonMock).toHaveBeenCalledWith({ data: mockOrder });
    });

    it("should return 404 if the order does not exist", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

        const { req } = createMocks({ method: "GET", url: "/api/orders/order123" });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest, { params: Promise.resolve({ id: "order123" }) });

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Product not found" },
            { status: 404 }
        );
    });

    it("should return 400 if the ID is missing", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const { req } = createMocks({ method: "GET", url: "/api/orders/" });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest, { params: Promise.resolve({ id: "" }) });

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Product ID is required" },
            { status: 400 }
        );
    });

    it("should return 500 if an error occurs", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockError = new Error("Database error");
        (prisma.order.findUnique as jest.Mock).mockRejectedValue(mockError);

        const { req } = createMocks({ method: "GET", url: "/api/orders/order123" });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest, { params: Promise.resolve({ id: "order123" }) });

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    });

    it("should return 401 if the user is not logged in", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

        const { req } = createMocks({ method: "GET", url: "/api/orders/order123" });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest, { params: Promise.resolve({ id: "order123" }) });

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Unauthorized" },
            { status: 401 }
        );
    });
});

describe("DELETE /api/orders/[id]", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should delete the order and restore the cart successfully", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockOrder = { id: "order123", cartId: "cart456" };

        (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
        (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
            return await callback(prisma);
        });

        const { req } = createMocks({ method: "DELETE", url: "/api/orders/order123" });
        req.nextUrl = new URL("http://localhost/api/orders/order123");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await DELETE(req as unknown as NextRequest);

        expect(prisma.order.findUnique).toHaveBeenCalledWith({ where: { id: "order123" } });

        expect(prisma.$transaction).toHaveBeenCalled();
        expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: "order123" } });
        expect(prisma.cart.update).toHaveBeenCalledWith({
            where: { id: "cart456" },
            data: { archived: false },
        });

        expect(jsonMock).toHaveBeenCalledWith(
            { message: "Order deleted and cart restored successfully" },
            { status: 200 }
        );
    });

    it("should return 404 if the order does not exist", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

        const { req } = createMocks({ method: "DELETE", url: "/api/orders/order123" });
        req.nextUrl = new URL("http://localhost/api/orders/order123");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await DELETE(req as unknown as NextRequest);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Order not found" },
            { status: 404 }
        );
    });

    it("should return 400 if the order ID is missing", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const { req } = createMocks({ method: "DELETE", url: "/api/orders/" });
        req.nextUrl = new URL("http://localhost/api/orders/");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await DELETE(req as unknown as NextRequest);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Order ID is required" },
            { status: 400 }
        );
    });

    it("should return 500 if an error occurs", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockError = new Error("Database error");
        (prisma.order.findUnique as jest.Mock).mockRejectedValue(mockError);

        const { req } = createMocks({ method: "DELETE", url: "/api/orders/order123" });
        req.nextUrl = new URL("http://localhost/api/orders/order123");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await DELETE(req as unknown as NextRequest);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error", details: "Database error" },
            { status: 500 }
        );
    });

    it("should handle an unknown error gracefully", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.order.findUnique as jest.Mock).mockImplementation(() => {
            throw "Unknown error";
        });

        const { req } = createMocks({ method: "DELETE", url: "/api/orders/order123" });
        req.nextUrl = new URL("http://localhost/api/orders/order123");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await DELETE(req as unknown as NextRequest);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error", details: "An unknown error occurred" },
            { status: 500 }
        );
    });
});
