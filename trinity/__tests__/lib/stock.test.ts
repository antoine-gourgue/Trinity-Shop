/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { nearbyStock, restock, storeStockMap } from "@/lib/stock";
import { storeQuantity } from "@/prisma/store-stock";

jest.mock("@/lib/prisma", () => ({
    storeStock: { findMany: jest.fn(), updateMany: jest.fn((args: object) => args) },
}));

const RENNES = { id: "store-rennes", latitude: 48.1003, longitude: -1.6696 };
const store = (slug: string, latitude: number, longitude: number) => ({ slug, name: `Trinity ${slug}`, city: slug, latitude, longitude });

describe("stock des magasins", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("reads the stock of products in one store", async () => {
        (prisma.storeStock.findMany as jest.Mock).mockResolvedValue([{ productId: "milk", quantity: 12 }]);

        const stock = await storeStockMap("store-rennes", ["milk", "coffee"]);

        expect(prisma.storeStock.findMany).toHaveBeenCalledWith({
            where: { storeId: "store-rennes", productId: { in: ["milk", "coffee"] } },
            select: { productId: true, quantity: true },
        });
        expect(stock.get("milk")).toBe(12);
        expect(stock.get("coffee")).toBeUndefined();
    });

    it("puts the items of a cancelled order back in the store that prepared it", () => {
        const operations = restock("store-nantes", [{ productId: "milk", quantity: 2 }]);

        expect(operations).toHaveLength(1);
        expect(prisma.storeStock.updateMany).toHaveBeenCalledWith({
            where: { storeId: "store-nantes", productId: "milk" },
            data: { quantity: { increment: 2 } },
        });
        expect(restock(null, [{ productId: "milk", quantity: 2 }])).toEqual([]);
    });

    it("suggests the closest stores that still have the product", async () => {
        (prisma.storeStock.findMany as jest.Mock).mockResolvedValue([
            { quantity: 5, store: store("brest", 48.3904, -4.4861) },
            { quantity: 8, store: store("cesson", 48.1211, -1.6031) },
            { quantity: 3, store: store("saint-malo", 48.6436, -2.0083) },
            { quantity: 9, store: store("nantes", 47.256, -1.524) },
        ]);

        const nearby = await nearbyStock("milk", RENNES);

        expect(prisma.storeStock.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { productId: "milk", quantity: { gt: 0 }, storeId: { not: "store-rennes" } } })
        );
        expect(nearby.map((entry) => entry.slug)).toEqual(["cesson", "saint-malo", "nantes"]);
    });
});

describe("répartition du stock entre les magasins", () => {
    it("keeps the original stock in the historic store", () => {
        expect(storeQuantity(120, "rennes-epitech", "milk", true)).toBe(120);
    });

    it("gives every store a stable quantity, with a few ruptures", () => {
        const quantities = Array.from({ length: 2000 }, (_, index) => storeQuantity(100, `store-${index % 80}`, `product-${index}`, false));

        expect(storeQuantity(100, "nantes", "milk", false)).toBe(storeQuantity(100, "nantes", "milk", false));
        expect(Math.min(...quantities)).toBe(0);
        expect(Math.max(...quantities)).toBeLessThanOrEqual(140);
        const ruptures = quantities.filter((quantity) => quantity === 0).length;
        expect(ruptures).toBeGreaterThan(0);
        expect(ruptures).toBeLessThan(60);
    });
});
