import { distanceKm, formatDistance, searchable } from "@/lib/geo";

describe("géolocalisation des magasins", () => {
    it("measures the distance between two cities", () => {
        const rennes = { latitude: 48.1173, longitude: -1.6778 };
        const nantes = { latitude: 47.2184, longitude: -1.5536 };

        expect(distanceKm(rennes, nantes)).toBeGreaterThan(95);
        expect(distanceKm(rennes, nantes)).toBeLessThan(105);
        expect(distanceKm(rennes, rennes)).toBe(0);
    });

    it("writes short distances in metres and long ones in kilometres", () => {
        expect(formatDistance(0.42)).toBe("420 m");
        expect(formatDistance(12.4)).toBe("12 km");
    });

    it("finds a city typed without accents or capitals", () => {
        expect(searchable("Évry-Courcouronnes")).toBe("evry courcouronnes");
        expect(searchable("Trinity Saint-Étienne 42000")).toContain("saint etienne 42000");
    });
});
