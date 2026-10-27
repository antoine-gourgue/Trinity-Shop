import { lineOutcome, preparationSummary, type PreparationLine } from "@/lib/orders/preparation";

const line = (overrides: Partial<PreparationLine> = {}): PreparationLine => ({
    quantity: 3,
    preparedQuantity: 3,
    allowSubstitute: true,
    product: { name: "Yaourt nature", price: 2000 },
    substitute: null,
    ...overrides,
});

describe("lineOutcome", () => {
    it("refunds nothing for an item fully picked", () => {
        expect(lineOutcome(line())).toEqual({ prepared: 3, missing: 0, substitute: null, refund: 0 });
    });

    it("refunds the missing units without a substitute", () => {
        expect(lineOutcome(line({ preparedQuantity: 1 }))).toMatchObject({ prepared: 1, missing: 2, refund: 4000 });
    });

    it("charges a substitute at the lower of the two prices", () => {
        const cheaper = lineOutcome(line({ preparedQuantity: 1, substitute: { name: "Yaourt bio", price: 1500 } }));
        expect(cheaper).toMatchObject({ missing: 2, substitute: { name: "Yaourt bio" }, refund: 1000 });

        // Un remplaçant plus cher ne coûte rien de plus au client
        const dearer = lineOutcome(line({ preparedQuantity: 0, substitute: { name: "Yaourt grec", price: 2600 } }));
        expect(dearer).toMatchObject({ missing: 3, refund: 0 });
    });

    it("ignores a substitute the customer refused", () => {
        const outcome = lineOutcome(line({ preparedQuantity: 0, allowSubstitute: false, substitute: { name: "Yaourt bio", price: 1500 } }));
        expect(outcome).toMatchObject({ substitute: null, refund: 6000 });
    });

    it("refunds a missing anti-waste item at the price actually paid", () => {
        // 3 yaourts à 2,00 €, dont 2 à −40 % : 1,60 € de remise sur la ligne, soit 1,47 € payé par unité en moyenne
        expect(lineOutcome(line({ preparedQuantity: 2, antiGaspiDiscount: 1600 }))).toMatchObject({ missing: 1, refund: 1470 });
    });

    it("treats an untouched line as fully picked", () => {
        expect(lineOutcome(line({ preparedQuantity: null }))).toMatchObject({ prepared: 3, missing: 0 });
    });
});

describe("preparationSummary", () => {
    it("waits for every line before the preparation can be finished", () => {
        const summary = preparationSummary([line(), line({ preparedQuantity: null })]);
        expect(summary).toMatchObject({ pending: 1, done: false });
    });

    it("lists the changes and adds up the refund", () => {
        const summary = preparationSummary([
            line(),
            line({ product: { name: "Beurre doux", price: 2500 }, quantity: 1, preparedQuantity: 0 }),
            line({ preparedQuantity: 2, substitute: { name: "Yaourt bio", price: 1800 } }),
        ]);

        expect(summary.done).toBe(true);
        expect(summary.refund).toBe(2700);
        expect(summary.changes).toEqual([
            { name: "Beurre doux", missing: 1, substitute: null, refund: 2500 },
            { name: "Yaourt nature", missing: 1, substitute: "Yaourt bio", refund: 200 },
        ]);
    });
});
