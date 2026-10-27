/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import {NextResponse} from "next/server";
import { GET, POST } from "@/app/api/orders/route";
import {isUserLoggedIn} from "@/services/auth/IsUserLoggedIn";
import { auth } from "@/auth";
import { buildRequest } from "@/test-utils/requests";
import { after } from "next/server";
import { SLOT_CAPACITY } from "@/lib/checkout";
import { storeForOrder } from "@/lib/stores";

// Fonction passée à prisma.$transaction, rejouée ici sur la doublure Prisma
type TransactionCallback = (tx: typeof prisma) => Promise<unknown>;

jest.mock("@/lib/prisma", () => ({
    order: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
    },
    storeStock: {
        updateMany: jest.fn(),
    },
    // Lots du drive : les commandes reçoivent les dates les plus longues
    stockLot: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    lotAllocation: {
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
    after: jest.fn(),
}));

// L'e-mail de confirmation est envoyé après la réponse : ici on vérifie seulement qu'il est programmé
jest.mock("@/lib/order-emails", () => ({
    sendOrderConfirmation: jest.fn(),
}));

// Magasin du client (celui de son compte, ou choisi avant la connexion)
jest.mock("@/lib/stores", () => ({
    storeForOrder: jest.fn(async () => "store1"),
}));

// Article de panier tel que le lit la route (prix et nom du produit)
const CART_ITEM = { id: "line1", productId: "prod1", quantity: 2, product: { price: 1000, name: "Lait demi-écrémé" } };

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

        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET();

        expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
        expect(jsonMock).toHaveBeenCalledWith({ data: mockOrders });
    });

    it("should return 500 if an error occurs", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const mockError = new Error("Database error");
        (prisma.order.findMany as jest.Mock).mockRejectedValue(mockError);

        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET();

        expect(jsonMock).toHaveBeenCalledWith(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    });

    it("should return 401 if user is not logged in", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

        const jsonMock = jest.spyOn(NextResponse, "json");

        await GET();

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
            productsInCart: [CART_ITEM],
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
        (prisma.storeStock.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

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
            include: {
                productsInCart: {
                    include: {
                        product: { select: { price: true, name: true } },
                        antiGaspiLot: { select: { id: true, storeId: true, quantity: true, bestBefore: true, closedAt: true, markdownDays: true } },
                    },
                },
            },
        });

        // Les unités viennent des lots aux dates les plus longues, rattachés à la ligne
        expect(prisma.stockLot.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { storeId: "store1", productId: "prod1", closedAt: null, quantity: { gt: 0 } } })
        );

        // Le stock du drive n'est décompté que s'il reste assez d'articles
        expect(prisma.storeStock.updateMany).toHaveBeenCalledWith({
            where: { storeId: "store1", productId: "prod1", quantity: { gte: 2 } },
            data: { quantity: { decrement: 2 } },
        });

        expect(prisma.order.create).toHaveBeenCalledWith({
            data: {
                userId: "user123",
                cartId: "cart456",
                billingAddressId: "111111",
                shippingAddressId: null,
                pickupSlot: null,
                storeId: "store1",
                loyaltyDiscount: 0,
                loyaltyPointsUsed: 0,
                loyaltyPointsEarned: 0,
                antiGaspiDiscount: 0,
                validated: true,
                stockDeducted: true,
            },
        });

        expect(prisma.cart.update).toHaveBeenCalledWith({
            where: { id: "cart456" },
            data: { archived: true },
        });

        expect(jsonMock).toHaveBeenCalledWith({ data: mockOrder }, { status: 201 });
        expect(after).toHaveBeenCalledTimes(1);
    });

    it("should refuse an empty cart", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ id: "cart456", userId: "user123", productsInCart: [] });
        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(buildRequest("/api/orders", { method: "POST", body: { userId: "user123", cartId: "cart456", billingAddressId: "111111" } }));

        expect(prisma.order.create).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith({ error: "Cart is empty" }, { status: 400 });
    });

    it("should refuse the order when an item is out of stock", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ id: "cart456", userId: "user123", productsInCart: [CART_ITEM] });
        (prisma.storeStock.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
        (prisma.$transaction as jest.Mock).mockImplementation(async (callback: TransactionCallback) => callback(prisma));
        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(buildRequest("/api/orders", { method: "POST", body: { userId: "user123", cartId: "cart456", billingAddressId: "111111" } }));

        expect(prisma.order.create).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith({ error: "Out of stock", products: ["Lait demi-écrémé"] }, { status: 409 });
    });

    it("should refuse a pickup slot that is already full", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ id: "cart456", userId: "user123", productsInCart: [CART_ITEM] });
        (prisma.order.count as jest.Mock).mockResolvedValue(SLOT_CAPACITY);
        (prisma.$transaction as jest.Mock).mockImplementation(async (callback: TransactionCallback) => callback(prisma));
        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(
            buildRequest("/api/orders", {
                method: "POST",
                body: { userId: "user123", cartId: "cart456", billingAddressId: "111111", pickupSlot: "2099-06-02_10" },
            })
        );

        expect(prisma.storeStock.updateMany).not.toHaveBeenCalled();
        expect(prisma.order.create).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith({ error: "Pickup slot full" }, { status: 409 });
        // Les places d'un créneau se comptent dans le drive du client
        expect(prisma.order.count).toHaveBeenCalledWith({
            where: { storeId: "store1", pickupSlot: new Date("2099-06-02T08:00:00.000Z"), status: { not: "cancelled" } },
        });
    });

    it("should refuse an order until the customer has chosen a store", async () => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        (storeForOrder as jest.Mock).mockResolvedValueOnce(null);
        const jsonMock = jest.spyOn(NextResponse, "json");

        await POST(buildRequest("/api/orders", { method: "POST", body: { userId: "user123", cartId: "cart456", billingAddressId: "111111" } }));

        expect(prisma.order.create).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith({ error: "Store required" }, { status: 400 });
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
        (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ id: "cart456", userId: "user123", productsInCart: [CART_ITEM] });
        (prisma.storeStock.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
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
