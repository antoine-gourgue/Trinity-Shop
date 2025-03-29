import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createMocks } from "node-mocks-http";
import { GET } from "@/app/api/orders/users/[id]/route";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";

jest.mock("@/lib/prisma", () => ({
    order: {
        findMany: jest.fn(),
    },
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

    it("should return orders for a user if they exist", async () => {
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

        const { req } = createMocks({ method: "GET", url: "/api/orders/user123" });
        req.nextUrl = new URL("http://localhost/api/orders/user123");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest);

        expect(prisma.order.findMany).toHaveBeenCalledWith({
            where: { userId: "user123" },
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

        expect(jsonMock).toHaveBeenCalledWith({ data: mockOrders }, { status: 200 });
    });

    it("should return 404 if no orders are found for a user", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.order.findMany as jest.Mock).mockResolvedValue([]);

        const { req } = createMocks({ method: "GET", url: "/api/orders/user123" });
        req.nextUrl = new URL("http://localhost/api/orders/user123");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Orders not found" },
            { status: 404 }
        );
    });

    it("should return 400 if the user ID is missing", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const { req } = createMocks({ method: "GET", url: "/api/orders/" });
        req.nextUrl = new URL("http://localhost/api/orders/");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "User ID is required" },
            { status: 400 }
        );
    });

    it("should return 500 if an error occurs", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockError = new Error("Database error");
        (prisma.order.findMany as jest.Mock).mockRejectedValue(mockError);

        const { req } = createMocks({ method: "GET", url: "/api/orders/user123" });
        req.nextUrl = new URL("http://localhost/api/orders/user123");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    });

    it("should return 401 if the user is not logged in", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(false);
        const { req } = createMocks({ method: "GET", url: "/api/orders/user123" });
        req.nextUrl = new URL("http://localhost/api/orders/user123");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req as unknown as NextRequest);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Unauthorized" },
            { status: 401 }
        );
    });
});
