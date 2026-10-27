/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { applyStorePromotion, storePromotions, withStoreLinePrices } from "@/lib/store-prices";

jest.mock("@/lib/prisma", () => ({ prospectusItem: { findMany: jest.fn() } }));

const findItems = prisma.prospectusItem.findMany as unknown as jest.Mock;
const NOW = new Date("2026-10-27T10:00:00Z");
const END = new Date("2026-11-01T23:00:00Z");

describe("applyStorePromotion", () => {
  const promotion = { price: 990, endsAt: END, prospectusId: "p1" };

  it("lowers the price and strikes through the usual one", () => {
    expect(applyStorePromotion({ price: 1490, regularPrice: null, promoEndsAt: null }, promotion)).toEqual({
      price: 990,
      regularPrice: 1490,
      promoEndsAt: END,
    });
  });

  it("keeps the usual price struck through when a national promotion is beaten", () => {
    expect(applyStorePromotion({ price: 1290, regularPrice: 1490, promoEndsAt: null }, promotion)).toMatchObject({ price: 990, regularPrice: 1490 });
  });

  it("never raises a price: a stronger national promotion stays", () => {
    const product = { price: 890, regularPrice: 1490, promoEndsAt: null };
    expect(applyStorePromotion(product, promotion)).toBe(product);
    expect(applyStorePromotion(product, undefined)).toBe(product);
  });
});

describe("storePromotions", () => {
  afterEach(() => jest.clearAllMocks());

  it("reads the running prospectuses of the store only", async () => {
    findItems.mockResolvedValue([]);
    await storePromotions("store1", ["a", "b", "a"], NOW);
    expect(findItems).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          productId: { in: ["a", "b"] },
          prospectus: { storeId: "store1", publishedAt: { not: null }, startsAt: { lte: NOW }, endsAt: { gt: NOW } },
        },
      })
    );
  });

  it("takes the lowest price when a product is in two prospectuses", async () => {
    findItems.mockResolvedValue([
      { productId: "a", price: 1290, prospectus: { id: "p1", endsAt: END } },
      { productId: "a", price: 990, prospectus: { id: "p2", endsAt: END } },
    ]);
    const promotions = await storePromotions("store1", ["a"], NOW);
    expect(promotions.get("a")).toEqual({ price: 990, endsAt: END, prospectusId: "p2" });
  });

  it("does not query without a store", async () => {
    expect((await storePromotions(null, ["a"], NOW)).size).toBe(0);
    expect(findItems).not.toHaveBeenCalled();
  });

  it("prices cart lines at the store price", async () => {
    findItems.mockResolvedValue([{ productId: "a", price: 990, prospectus: { id: "p1", endsAt: END } }]);
    const lines = await withStoreLinePrices(
      [
        { productId: "a", quantity: 2, product: { price: 1490 } },
        { productId: "b", quantity: 1, product: { price: 500 } },
      ],
      "store1",
      NOW
    );
    expect(lines.map((line) => line.product.price)).toEqual([990, 500]);
  });
});
