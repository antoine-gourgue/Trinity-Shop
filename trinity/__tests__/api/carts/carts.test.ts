/**
 * @jest-environment node
 */
import { GET as getAllCarts } from "@/app/api/carts/route";
import { GET as getUserCart, POST as updateUserCart } from "@/app/api/carts/users/[id]/route";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { buildRequest } from "@/test-utils/requests";

jest.mock("@/lib/prisma", () => ({
    cart: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
    },
    productInCart: {
        update: jest.fn(),
        create: jest.fn(),
    }
}));

jest.mock("next/server", () => ({
    NextResponse: {
        json: jest.fn(),
    },
}));

jest.mock("@/services/auth/IsUserLoggedIn", () => ({
    isUserLoggedIn: jest.fn(),
}));

// Contrôles d'accès simulés : autorisés par défaut, chaque test peut les refuser
jest.mock("@/services/auth/guards", () => ({
    isAdmin: jest.fn().mockResolvedValue(true),
    canAccessUser: jest.fn().mockResolvedValue(true),
    canAccessOrder: jest.fn().mockResolvedValue(true),
    canAccessCart: jest.fn().mockResolvedValue(true),
}));

describe("API: /api/carts", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/carts", () => {
        it("should return all carts successfully", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockCarts = [
                {
                    id: "cart1",
                    userId: "user1",
                    productsInCart: [{ productId: "prod1", quantity: 2 }],
                },
            ];
            (prisma.cart.findMany as jest.Mock).mockResolvedValue(mockCarts);

            const jsonMock = jest.spyOn(NextResponse, "json");
            const req = buildRequest("/api/carts");

            await getAllCarts(req);

            expect(prisma.cart.findMany).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith({ data: mockCarts });
        });

        it("should handle database errors", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            const mockError = new Error("Database error");
            (prisma.cart.findMany as jest.Mock).mockRejectedValue(mockError);

            const jsonMock = jest.spyOn(NextResponse, "json");
            const req = buildRequest("/api/carts");

            await getAllCarts(req);

            expect(jsonMock).toHaveBeenCalledWith({ error: "Internal Server Error" }, { status: 500 });
        });

        it("should return 401 if user is not logged in", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            const jsonMock = jest.spyOn(NextResponse, "json");
            const req = buildRequest("/api/carts");

            await getAllCarts(req);

            expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized" }, { status: 401 });
        });
    });

    describe("GET /api/carts/users/[id]", () => {
        it("should return user cart if it exists", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);

            const mockCart = {
                id: "cart1",
                userId: "user1",
                archived: false,
                productsInCart: [{ productId: "prod1", quantity: 2 }],
            };
            (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);

            const req = buildRequest("/api/carts/users/user1");

            const jsonMock = jest.spyOn(NextResponse, "json");

            await getUserCart(req);

            expect(prisma.cart.findFirst).toHaveBeenCalledWith({
                where: { userId: "user1", archived: false },
                include: {
                    productsInCart: {
                        select: {
                            productId: true,
                            quantity: true,
                        },
                    },
                },
            });

            expect(jsonMock).toHaveBeenCalledWith({ data: mockCart });
        });

        it("should return 404 if user cart is not found", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);

            (prisma.cart.findFirst as jest.Mock).mockResolvedValue(null);

            const req = buildRequest("/api/carts/users/user1");

            const jsonMock = jest.spyOn(NextResponse, "json");

            await getUserCart(req);

            expect(jsonMock).toHaveBeenCalledWith(
                { error: "Cart not found for the user" },
                { status: 404 }
            );
        });

        it("should return 400 if user ID is missing", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);

            const req = buildRequest("/api/carts/users/");

            const jsonMock = jest.spyOn(NextResponse, "json");

            await getUserCart(req);

            expect(jsonMock).toHaveBeenCalledWith(
                { error: "User ID is required" },
                { status: 400 }
            );
        });

        it("should return 401 if user is not logged in", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

            const req = buildRequest("/api/carts/users/user1");

            const jsonMock = jest.spyOn(NextResponse, "json");

            await getUserCart(req);

            expect(jsonMock).toHaveBeenCalledWith(
                { error: "Unauthorized" },
                { status: 401 }
            );
        });
    });

    describe("POST /api/carts/users/[id]", () => {
        it("should create a new cart if it does not exist", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);

            (prisma.cart.findFirst as jest.Mock).mockResolvedValue(null);

            const mockNewCart = {
                id: "cart1",
                userId: "user1",
                productsInCart: [{ productId: "prod1", quantity: 3 }],
            };
            (prisma.cart.create as jest.Mock).mockResolvedValue(mockNewCart);

            const req = buildRequest("/api/carts/users/user1", {
                method: "POST",
                body: {
                    productId: "prod1",
                    quantity: 3,
                },
            });

            const jsonMock = jest.spyOn(NextResponse, "json");

            await updateUserCart(req);

            expect(prisma.cart.findFirst).toHaveBeenCalledWith({
                where: { userId: "user1", archived: false },
                include: { productsInCart: true },
            });

            expect(prisma.cart.create).toHaveBeenCalledWith({
                data: {
                    userId: "user1",
                    productsInCart: { create: { productId: "prod1", quantity: 3 } },
                },
                include: { productsInCart: true },
            });

            expect(jsonMock).toHaveBeenCalledWith({ data: mockNewCart }, { status: 201 });
        });

        it("should add a new product to an existing cart", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);

            const mockCart = {
                id: "cart1",
                userId: "user1",
                archived: false,
                productsInCart: [
                    { id: "prodInCart1", productId: "prod1", quantity: 2 },
                ],
            };
            (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);

            const mockNewProduct = {
                id: "prodInCart2",
                productId: "prod2",
                quantity: 3,
                cartId: "cart1",
            };
            (prisma.productInCart.create as jest.Mock).mockResolvedValue(mockNewProduct);

            const req = buildRequest("/api/carts/users/user1", {
                method: "POST",
                body: {
                    productId: "prod2",
                    quantity: 3,
                },
            });

            const jsonMock = jest.spyOn(NextResponse, "json");

            await updateUserCart(req);

            expect(prisma.cart.findFirst).toHaveBeenCalledWith({
                where: { userId: "user1", archived: false },
                include: { productsInCart: true },
            });

            expect(prisma.productInCart.create).toHaveBeenCalledWith({
                data: {
                    cartId: "cart1",
                    productId: "prod2",
                    quantity: 3,
                },
            });

            expect(jsonMock).toHaveBeenCalledWith({ data: mockNewProduct }, { status: 200 });
        });

        it("should update the quantity of an existing product in the cart", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);

            const mockCart = {
                id: "cart1",
                userId: "user1",
                archived: false,
                productsInCart: [
                    { id: "prodInCart1", productId: "prod1", quantity: 2 },
                ],
            };
            (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);

            const mockUpdatedProduct = {
                id: "prodInCart1",
                productId: "prod1",
                quantity: 5,
                cartId: "cart1",
            };
            (prisma.productInCart.update as jest.Mock).mockResolvedValue(mockUpdatedProduct);

            const req = buildRequest("/api/carts/users/user1", {
                method: "POST",
                body: {
                    productId: "prod1",
                    quantity: 3,
                },
            });

            const jsonMock = jest.spyOn(NextResponse, "json");

            await updateUserCart(req);

            expect(prisma.productInCart.update).toHaveBeenCalledWith({
                where: { id: "prodInCart1" },
                data: { quantity: 5 },
            });

            expect(jsonMock).toHaveBeenCalledWith({ data: mockUpdatedProduct }, { status: 200 });
        });

        it("should return 400 for invalid input", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);

            const req = buildRequest("/api/carts/users/user1", {
                method: "POST",
                body: {
                    productId: "",
                    quantity: -1,
                },
            });

            const jsonMock = jest.spyOn(NextResponse, "json");

            await updateUserCart(req);

            expect(jsonMock).toHaveBeenCalledWith(
                { error: "Invalid user ID, product ID, or quantity" },
                { status: 400 },
            );
        });

        it("should return 500 for a database error", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(true);

            const mockError = new Error("Database error");
            (prisma.cart.findFirst as jest.Mock).mockRejectedValue(mockError);

            const req = buildRequest("/api/carts/users/user1", {
                method: "POST",
                body: {
                    productId: "prod1",
                    quantity: 3,
                },
            });

            const jsonMock = jest.spyOn(NextResponse, "json");

            await updateUserCart(req);

            expect(jsonMock).toHaveBeenCalledWith(
                { error: "Internal server error" },
                { status: 500 },
            );
        });

        it("should return 401 if user is not logged in", async () => {
            (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

            const req = buildRequest("/api/carts/users/user1", {
                method: "POST",
                body: {
                    productId: "prod1",
                    quantity: 3,
                },
            });

            const jsonMock = jest.spyOn(NextResponse, "json");

            await updateUserCart(req);

            expect(jsonMock).toHaveBeenCalledWith(
                { error: "Unauthorized" },
                { status: 401 },
            );
        });
    });

});
