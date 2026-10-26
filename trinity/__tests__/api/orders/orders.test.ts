/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import {NextResponse} from "next/server";
import { GET, POST } from "@/app/api/orders/route";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { auth } from "@/auth";
import { buildRequest } from "@/test-utils/requests";

// Fonction passée à prisma.$transaction, rejouée ici sur la doublure Prisma
type TransactionCallback = (tx: typeof prisma) => Promise<unknown>;

jest.mock("@/lib/prisma", () => ({
    order: {
        findMany: jest.fn(),
        create: jest.fn(),
    },
    cart: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
    address: {
        findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: object) => unknown) => callback({
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

// Contrôles d'accès simulés : autorisés par défaut, chaque test peut les refuser
jest.mock("@/services/auth/guards", () => ({
    isAdmin: jest.fn().mockResolvedValue(true),
    canAccessUser: jest.fn().mockResolvedValue(true),
    canAccessOrder: jest.fn().mockResolvedValue(true),
    canAccessCart: jest.fn().mockResolvedValue(true),
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

        const req = buildRequest("/api/orders");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req);

        expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
        expect(jsonMock).toHaveBeenCalledWith({ data: mockOrders });
    });

    it("should return 500 if an error occurs", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockError = new Error("Database error");
        (prisma.order.findMany as jest.Mock).mockRejectedValue(mockError);

        const req = buildRequest("/api/orders");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    });

    it("should return 401 if user is not logged in", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

        const req = buildRequest("/api/orders");
        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET(req);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Unauthorized" },
            { status: 401 }
        );
    });
});

describe("POST /api/orders", () => {
    // Commande passée par le compte connecté « user123 »
    beforeEach(() => {
        (auth as jest.Mock).mockResolvedValue({ user: { id: "user123" } });
    });

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

        (prisma.$transaction as jest.Mock).mockImplementation(async (callback: TransactionCallback) => {
            return await callback(prisma);
        });

        const req = buildRequest("/api/orders", {
            method: "POST",
            body: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
            },
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req);

        expect(prisma.cart.findUnique).toHaveBeenCalledWith({
            where: { id: "cart456" },
            include: { productsInCart: { include: { product: { select: { price: true } } } } },
        });

        expect(prisma.order.create).toHaveBeenCalledWith({
            data: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
                shippingAddressId: null,
                pickupSlot: null,
                loyaltyDiscount: 0,
                loyaltyPointsUsed: 0,
                loyaltyPointsEarned: 0,
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
        const req = buildRequest("/api/orders", {
            method: "POST",
            body: {
                userId: "",
                cartId: "",
                billingAddressId: "",
            },
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "User ID and Cart ID are required" },
            { status: 400 }
        );
    });

    it("should return 403 when ordering for another account", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (auth as jest.Mock).mockResolvedValue({ user: { id: "someone-else" } });

        const req = buildRequest("/api/orders", {
            method: "POST",
            body: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
            },
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req);

        expect(jsonMock).toHaveBeenCalledWith({ error: "Forbidden" }, { status: 403 });
        expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("should refuse home delivery to an address of another customer", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.address.findUnique as jest.Mock).mockResolvedValue({ userId: "someone-else" });

        const req = buildRequest("/api/orders", {
            method: "POST",
            body: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
                fulfillment: "delivery",
                shippingAddressId: "address-of-someone-else",
            },
        });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req);

        expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid delivery address" }, { status: 400 });
        expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("should store the delivery address of a home delivery", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.address.findUnique as jest.Mock).mockResolvedValue({ userId: "user123" });
        (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ id: "cart456", userId: "user123", productsInCart: [] });
        (prisma.order.create as jest.Mock).mockResolvedValue({ id: "order123" });
        (prisma.$transaction as jest.Mock).mockImplementation(async (callback: TransactionCallback) => callback(prisma));

        const req = buildRequest("/api/orders", {
            method: "POST",
            body: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
                fulfillment: "delivery",
                shippingAddressId: "home-address",
            },
        });

        await POST(req);

        // expect.objectContaining est typé any : on le range dans une variable unknown
        const expectedData: unknown = expect.objectContaining({ shippingAddressId: "home-address" });
        expect(prisma.order.create).toHaveBeenCalledWith({ data: expectedData });
    });

    it("should return 404 if cart is not found", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.cart.findUnique as jest.Mock).mockResolvedValue(null);

        const req = buildRequest("/api/orders", {
            method: "POST",
            body: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
            },
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req);

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

        const req = buildRequest("/api/orders", {
            method: "POST",
            body: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
            },
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "This cart does not belong to the specified user" },
            { status: 403 }
        );
    });

    it("should return 500 if an error occurs", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockError = new Error("Database error");

        (prisma.cart.findUnique as jest.Mock).mockRejectedValue(mockError);

        const req = buildRequest("/api/orders", {
            method: "POST",
            body: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
            },
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error", details: "Database error" },
            { status: 500 }
        );
    });

    it("should return 500 with a generic message for unknown errors", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.cart.findUnique as jest.Mock).mockRejectedValue("Unknown error");

        const body: { userId: string; cartId: string; billingAddressId: string } = {
            userId: "user123",
            cartId: "cart456",
            billingAddressId: "111111",
        };

        const req = buildRequest("/api/orders", { method: "POST", body });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req);

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

        const req = buildRequest("/api/orders", {
            method: "POST",
            body: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
            },
        });

        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(req);

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Unauthorized" },
            { status: 401 }
        );

    });
});
