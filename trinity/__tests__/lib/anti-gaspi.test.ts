import {
    allocateAntiGaspi,
    bestBeforeFromDay,
    daysLeft,
    formatBestBefore,
    lotPricing,
    lotStage,
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
    markdownDays: 5,
    ...overrides,
});

describe("markdownPercent", () => {
    it("grows as the best-before date gets closer", () => {
        expect([5, 4, 3, 2, 1].map((days) => markdownPercent(days))).toEqual([20, 20, 30, 40, 50]);
    });

    it("waits for the window of the lot: bread is only marked down the day before", () => {
        expect(markdownPercent(2, 1)).toBeNull();
        expect(markdownPercent(1, 1)).toBe(50);
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

describe("lotStage", () => {
    const at = (day: string, withdrawnAt: Date | null = null) => ({ bestBefore: bestBeforeFromDay(day), markdownDays: 5, withdrawnAt });

    it("follows a lot to the end of its life", () => {
        expect(lotStage(at("2026-11-20"), NOW)).toBe("in-stock");
        expect(lotStage(at("2026-10-29"), NOW)).toBe("on-sale");
        // Date du jour : plus vendu en ligne, à donner
        expect(lotStage(at("2026-10-27"), NOW)).toBe("last-day");
        // Date passée, ou retiré de la vente la nuit : à jeter
        expect(lotStage(at("2026-10-26"), NOW)).toBe("expired");
        expect(lotStage(at("2026-10-27", NOW), NOW)).toBe("expired");
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

describe("formatBestBefore", () => {
  const now = new Date("2026-10-27T10:00:00Z");

  it("leaves out the current year, and shows another one", () => {
    expect(formatBestBefore(new Date("2026-10-29T00:00:00Z"), now)).toBe("jeudi 29 octobre");
    // Hygiène, entretien : un lot qui se garde trois ans
    expect(formatBestBefore(new Date("2029-10-23T00:00:00Z"), now)).toBe("mardi 23 octobre 2029");
  });
});
