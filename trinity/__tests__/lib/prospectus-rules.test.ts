import {
  formatProspectusDates,
  formatProspectusLastDay,
  prospectusBanner,
  prospectusDays,
  prospectusLength,
  prospectusPeriod,
  prospectusPriceError,
  prospectusStatus,
} from "@/lib/prospectus-rules";

const NOW = new Date("2026-10-27T10:00:00Z");
const period = { startsAt: new Date("2026-10-26T23:00:00Z"), endsAt: new Date("2026-11-01T23:00:00Z") };

describe("prospectusStatus", () => {
  it("keeps an unpublished prospectus in draft, whatever its dates", () => {
    expect(prospectusStatus({ ...period, publishedAt: null }, NOW)).toBe("draft");
  });

  it("follows the dates once published", () => {
    const published = new Date("2026-10-20T08:00:00Z");
    expect(prospectusStatus({ ...period, publishedAt: published }, new Date("2026-10-26T22:59:59Z"))).toBe("scheduled");
    expect(prospectusStatus({ ...period, publishedAt: published }, NOW)).toBe("running");
    // La fin est exclusive : à minuit après le dernier jour, c'est terminé
    expect(prospectusStatus({ ...period, publishedAt: published }, new Date("2026-11-01T23:00:00Z"))).toBe("ended");
  });
});

describe("prospectusPeriod", () => {
  it("runs from midnight on the first day to midnight after the last, Paris time", () => {
    // Heure d'hiver (UTC+1)
    expect(prospectusPeriod("2026-10-27", "2026-11-01")).toEqual(period);
    // Heure d'été (UTC+2)
    expect(prospectusPeriod("2026-06-01", "2026-06-07")).toEqual({
      startsAt: new Date("2026-05-31T22:00:00Z"),
      endsAt: new Date("2026-06-07T22:00:00Z"),
    });
  });

  it("handles the night the clocks go back", () => {
    // Passage à l'heure d'hiver dans la nuit du 24 au 25 octobre 2026
    expect(prospectusPeriod("2026-10-24", "2026-10-25")).toEqual({
      startsAt: new Date("2026-10-23T22:00:00Z"),
      endsAt: new Date("2026-10-25T23:00:00Z"),
    });
  });

  it("gives back the days typed in the form", () => {
    expect(prospectusDays(prospectusPeriod("2026-10-24", "2026-10-25"))).toEqual({ firstDay: "2026-10-24", lastDay: "2026-10-25" });
    expect(prospectusLength("2026-10-27", "2026-11-01")).toBe(6);
    expect(prospectusLength("2026-10-27", "2026-10-27")).toBe(1);
  });
});

describe("prospectusPriceError", () => {
  it("accepts a real discount on the current price", () => {
    expect(prospectusPriceError(1490, 1990)).toBeNull();
  });

  it("refuses a price that is not lower, or a discount that looks like a typo", () => {
    expect(prospectusPriceError(1990, 1990)).toMatch(/plus bas/);
    expect(prospectusPriceError(2490, 1990)).toMatch(/plus bas/);
    expect(prospectusPriceError(190, 1990)).toMatch(/80 %/);
    expect(prospectusPriceError(0, 1990)).toBe("Prix invalide.");
  });
});

describe("prospectus labels", () => {
  it("shows the first and the last day", () => {
    expect(formatProspectusDates(period)).toBe("Du mar. 27 oct. au dim. 1 nov.");
    expect(formatProspectusLastDay(period.endsAt)).toBe("dimanche 1 novembre");
  });

  it("builds the home banner from the best offers", () => {
    const offers = [
      { id: "a", name: "Lait", picture: "/a.jpg", percent: 20 },
      { id: "b", name: "Café", picture: "/b.jpg", percent: 35 },
      { id: "c", name: "Thé", picture: "/c.jpg", percent: 10 },
      { id: "d", name: "Riz", picture: "/d.jpg", percent: 30 },
    ];
    const banner = prospectusBanner({ id: "p1", title: "Les prix d'automne", ...period }, offers);
    expect(banner).toMatchObject({
      href: "/prospectus/p1",
      tone: "promo",
      kicker: "Les prix d'automne",
      title: "Jusqu'à −35 %",
      text: "4 produits à prix promo jusqu'au dimanche 1 novembre",
    });
    expect(banner.visual).toEqual({ kind: "products", products: [offers[1], offers[3], offers[0]] });
  });
});
