/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { expirePromotions, formatPromoEnd, promoEndFromDay, promoLastDay } from "@/lib/promotions";

jest.mock("@/lib/prisma", () => ({
    product: { findMany: jest.fn(), update: jest.fn((args: object) => args) },
    favorite: { updateMany: jest.fn((args: object) => args) },
    $transaction: jest.fn(async (operations: object[]) => operations),
}));

describe("dates de fin de promotion", () => {
    it("ends at midnight in Paris after the last day, summer or winter time", () => {
        // 25 octobre 2026 : passage à l'heure d'hiver dans la nuit du 24 au 25
        expect(promoEndFromDay("2026-10-24").toISOString()).toBe("2026-10-24T22:00:00.000Z");
        expect(promoEndFromDay("2026-11-02").toISOString()).toBe("2026-11-02T23:00:00.000Z");
    });

    it("gives back the last day for the form and the product page", () => {
        const end = promoEndFromDay("2026-11-02");
        expect(promoLastDay(end)).toBe("2026-11-02");
        expect(formatPromoEnd(end)).toBe("lundi 2 novembre");
    });
});

describe("expirePromotions", () => {
    it("restores the regular price of ended promotions", async () => {
        (prisma.product.findMany as jest.Mock).mockResolvedValue([
            { id: "p1", regularPrice: 2490 },
            { id: "p2", regularPrice: null },
        ]);
        const now = new Date("2026-11-03T00:30:00Z");

        await expect(expirePromotions(now)).resolves.toEqual(["p1", "p2"]);
        expect(prisma.product.findMany).toHaveBeenCalledWith({
            where: { promoEndsAt: { lte: now } },
            select: { id: true, regularPrice: true },
        });
        expect(prisma.product.update).toHaveBeenCalledWith({
            where: { id: "p1" },
            data: { price: 2490, regularPrice: null, promoEndsAt: null },
        });
        expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: "p2" }, data: { promoEndsAt: null } });
        // La prochaine promotion de ces produits préviendra de nouveau les clients qui les ont en favori
        expect(prisma.favorite.updateMany).toHaveBeenCalledWith({
            where: { productId: { in: ["p1", "p2"] }, promoNotifiedAt: { not: null } },
            data: { promoNotifiedAt: null },
        });
    });

    it("does nothing when no promotion has ended", async () => {
        (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

        await expect(expirePromotions()).resolves.toEqual([]);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });
});
