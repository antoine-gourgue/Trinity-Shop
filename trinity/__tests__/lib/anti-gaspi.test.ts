import {
    allocateAntiGaspi,
    bestBeforeFromDay,
    daysLeft,
    lotPricing,
    markdownPercent,
    unitDiscount,
    validAtPickup,
    type LotOffer,
} from "@/lib/anti-gaspi";

// Mardi 27 octobre 2026, 10 h à Paris
const NOW = new Date("2026-10-27T09:00:00Z");

const lot = (overrides: Partial<LotOffer> = {}): LotOffer => ({
    id: "lot1",
    storeId: "nantes",
    quantity: 4,
    bestBefore: bestBeforeFromDay("2026-10-29"),
    closedAt: null,
    ...overrides,
});

describe("markdownPercent", () => {
    it("grows as the best-before date gets closer", () => {
        expect([5, 4, 3, 2, 1].map(markdownPercent)).toEqual([20, 20, 30, 40, 50]);
    });

    it("is not on sale too early, nor on the last day (the first pickup is tomorrow)", () => {
        expect(markdownPercent(6)).toBeNull();
        expect(markdownPercent(0)).toBeNull();
        expect(markdownPercent(-2)).toBeNull();
    });
});

describe("daysLeft", () => {
    it("counts calendar days in Paris", () => {
        expect(daysLeft(bestBeforeFromDay("2026-10-29"), NOW)).toBe(2);
        expect(daysLeft(bestBeforeFromDay("2026-10-27"), NOW)).toBe(0);
        // 0 h 30 à Paris le 28 : le 28 est déjà « aujourd'hui »
        expect(daysLeft(bestBeforeFromDay("2026-10-29"), new Date("2026-10-27T23:30:00Z"))).toBe(1);
    });
});

describe("lotPricing", () => {
    it("rounds the discount to the cent", () => {
        expect(unitDiscount(1190, 30)).toBe(360);
        expect(lotPricing(lot(), 1190, NOW)).toEqual({ percent: 40, days: 2, unitDiscount: 480, unitPrice: 710 });
    });

    it("is off sale once the lot is closed or sold out", () => {
        expect(lotPricing(lot({ closedAt: NOW }), 1190, NOW)).toBeNull();
        expect(lotPricing(lot({ quantity: 0 }), 1190, NOW)).toBeNull();
    });
});

describe("validAtPickup", () => {
    it("accepts a pickup up to the best-before day", () => {
        const bestBefore = bestBeforeFromDay("2026-10-29");
        expect(validAtPickup(bestBefore, new Date("2026-10-29T17:00:00Z"))).toBe(true);
        expect(validAtPickup(bestBefore, new Date("2026-10-30T08:00:00Z"))).toBe(false);
    });
});

describe("allocateAntiGaspi", () => {
    const line = { productId: "p1", quantity: 6, price: 1190, lot: lot() };

    it("serves the lot units first, up to the quantity ordered", () => {
        const { allocations, discount } = allocateAntiGaspi([line, { ...line, productId: "p2", lot: null }], "nantes", null, NOW);
        expect(allocations).toEqual([{ productId: "p1", lotId: "lot1", units: 4, percent: 40, discount: 1920 }]);
        expect(discount).toBe(1920);
    });

    it("ignores a lot of another store, or past its date at pickup", () => {
        expect(allocateAntiGaspi([line], "rennes", null, NOW).discount).toBe(0);
        expect(allocateAntiGaspi([line], "nantes", new Date("2026-10-31T09:00:00Z"), NOW).discount).toBe(0);
    });
});
