import { DEFAULT_SHELF_LIFE, initialLots, markdownWindow, shelfLifeDays } from "@/lib/shelf-life";
import { expectedDelivery, suggestedQuantity } from "@/lib/restock";

describe("shelfLifeDays", () => {
    it("follows the shelf and its exceptions", () => {
        expect(shelfLifeDays(["Pains"])).toBe(4);
        expect(shelfLifeDays(["Brioches"])).toBe(15);
        expect(shelfLifeDays(["Yaourts"])).toBe(25);
        expect(shelfLifeDays(["Pâtes alimentaires"])).toBe(365);
        expect(shelfLifeDays([])).toBe(DEFAULT_SHELF_LIFE);
    });
});

describe("markdownWindow", () => {
    it("marks bread down the day before only, and long-life products five days before", () => {
        expect([3, 4, 5, 7, 21, 365].map(markdownWindow)).toEqual([1, 1, 2, 2, 5, 5]);
    });
});

describe("initialLots", () => {
    const keys = Array.from({ length: 2000 }, (_, index) => `store-${index % 81}:product-${index}`);

    it("splits the whole stock into dated lots, the same way every time", () => {
        for (const [quantity, shelfLife] of [[3, 7], [57, 7], [5, 25], [240, 365], [4, 4]]) {
            const lots = initialLots(quantity, shelfLife, "nantes:yaourt");
            expect(lots.reduce((total, lot) => total + lot.quantity, 0)).toBe(quantity);
            expect(lots.every((lot) => lot.quantity > 0 && lot.daysLeft >= 1 && lot.daysLeft <= shelfLife)).toBe(true);
            expect(initialLots(quantity, shelfLife, "nantes:yaourt")).toEqual(lots);
        }
        expect(initialLots(0, 7, "nantes:yaourt")).toEqual([]);
    });

    it("gives fresh products a short-dated lot now and then", () => {
        const fresh = keys.map((key) => initialLots(60, 21, key));
        expect(fresh.every((lots) => lots.length === 3)).toBe(true);
        const shortDated = fresh.filter((lots) => lots.some((lot) => lot.daysLeft <= markdownWindow(21))).length / keys.length;
        expect(shortDated).toBeGreaterThan(0.08);
        expect(shortDated).toBeLessThan(0.25);
        // Épicerie : deux lots, rarement à date courte
        expect(initialLots(60, 365, keys[0])).toHaveLength(2);
    });
});

describe("suggestedQuantity", () => {
    it("refills to two weeks of sales, and at least to the target stock", () => {
        expect(suggestedQuantity(5, 0)).toBe(75);
        expect(suggestedQuantity(5, 140)).toBe(135);
        expect(suggestedQuantity(120, 10)).toBe(0);
    });
});

describe("expectedDelivery", () => {
    it("delivers the next day at 7 am in Paris, Monday instead of Sunday", () => {
        // Mardi 27 octobre 2026 (heure d'hiver)
        expect(expectedDelivery(new Date("2026-10-27T09:00:00Z")).toISOString()).toBe("2026-10-28T06:00:00.000Z");
        // Samedi 31 octobre : livré lundi 2 novembre
        expect(expectedDelivery(new Date("2026-10-31T09:00:00Z")).toISOString()).toBe("2026-11-02T06:00:00.000Z");
    });
});
