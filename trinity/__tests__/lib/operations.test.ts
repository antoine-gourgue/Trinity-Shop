import { antiGaspiOutcome, driveWait, formatMinutes, formatRate, preparationStats, slotLoad, upcomingDays } from "@/lib/admin/operations";

const at = (iso: string) => new Date(iso);

describe("preparationStats", () => {
    it("measures preparation time, punctuality, missing items and substitutions", () => {
        const stats = preparationStats([
            {
                preparationStartedAt: at("2026-10-27T08:00:00Z"),
                preparedAt: at("2026-10-27T08:12:00Z"),
                pickupSlot: at("2026-10-27T09:00:00Z"),
                preparationRefund: 1190,
                lines: [
                    { quantity: 4, preparedQuantity: 3, substituteId: "p9", allowSubstitute: true },
                    { quantity: 2, preparedQuantity: 1, substituteId: null, allowSubstitute: true },
                ],
            },
            {
                preparationStartedAt: at("2026-10-27T10:00:00Z"),
                preparedAt: at("2026-10-27T10:20:00Z"),
                pickupSlot: at("2026-10-27T10:00:00Z"),
                preparationRefund: 0,
                lines: [
                    { quantity: 4, preparedQuantity: 4, substituteId: null, allowSubstitute: true },
                    // Commande avancée sans l'écran de préparation : ligne ignorée
                    { quantity: 10, preparedQuantity: null, substituteId: null, allowSubstitute: true },
                ],
            },
        ]);

        expect(stats).toEqual({ prepared: 2, averageMinutes: 16, onTimeRate: 0.5, missingRate: 0.2, substitutionRate: 0.5, refunded: 1190 });
    });

    it("has no figures without data", () => {
        expect(preparationStats([])).toMatchObject({ averageMinutes: null, onTimeRate: null, missingRate: null, substitutionRate: null });
    });
});

describe("driveWait", () => {
    it("averages the wait between arrival and hand-over", () => {
        expect(
            driveWait([
                { arrivedAt: at("2026-10-27T09:00:00Z"), completedAt: at("2026-10-27T09:04:00Z") },
                { arrivedAt: at("2026-10-27T10:00:00Z"), completedAt: at("2026-10-27T10:03:00Z") },
                { arrivedAt: null, completedAt: at("2026-10-27T11:00:00Z") },
            ])
        ).toEqual({ handedOver: 2, averageMinutes: 3.5 });
    });
});

describe("slotLoad", () => {
    it("counts bookings per day and hour in Paris time", () => {
        const days = upcomingDays(at("2026-10-27T08:00:00Z"), 2);
        expect(days.map((day) => day.date)).toEqual(["2026-10-27", "2026-10-28"]);

        // 9 h et 10 h à Paris le 27 octobre (heure d'hiver)
        const grid = slotLoad(
            [
                { pickupSlot: at("2026-10-27T08:00:00Z"), count: 6 },
                { pickupSlot: at("2026-10-27T09:00:00Z"), count: 9 },
            ],
            days,
            [9, 10, 11],
            8
        );
        expect(grid[0].slots).toEqual([
            { hour: 9, count: 6, rate: 0.75 },
            { hour: 10, count: 9, rate: 1 },
            { hour: 11, count: 0, rate: 0 },
        ]);
    });

    it("skips Sundays", () => {
        // Samedi 31 octobre : le dimanche 1er novembre est sauté
        expect(upcomingDays(at("2026-10-31T08:00:00Z"), 2).map((day) => day.date)).toEqual(["2026-10-31", "2026-11-02"]);
    });
});

describe("antiGaspiOutcome", () => {
    it("counts sold and donated units as saved", () => {
        expect(antiGaspiOutcome({ sold: 12, donated: 3, wasted: 5 })).toEqual({ sold: 12, donated: 3, wasted: 5, saved: 15, rescueRate: 0.75 });
        expect(antiGaspiOutcome({ sold: 0, donated: 0, wasted: 0 }).rescueRate).toBeNull();
    });
});

describe("formatting", () => {
    it("prints rates and durations", () => {
        expect(formatRate(0.873)).toBe("87 %");
        expect(formatRate(null)).toBe("—");
        expect(formatMinutes(14)).toBe("14 min");
        expect(formatMinutes(65)).toBe("1 h 05");
    });
});
