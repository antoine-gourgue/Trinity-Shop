/**
 * @jest-environment node
 */
import { absoluteUrl, siteUrl } from "@/lib/site-url";

describe("siteUrl", () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterAll(() => {
    process.env = original;
  });

  it("utilise APP_URL en priorité, sans barre oblique finale", () => {
    process.env.APP_URL = "https://shop.example.com/";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "trinity.vercel.app";
    expect(siteUrl()).toBe("https://shop.example.com");
  });

  it("ajoute https:// à une APP_URL donnée sans protocole", () => {
    process.env.APP_URL = "shop.example.com";
    expect(siteUrl()).toBe("https://shop.example.com");
  });

  it("se rabat sur le domaine de production Vercel", () => {
    process.env.APP_URL = "  ";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "trinity.vercel.app";
    expect(siteUrl()).toBe("https://trinity.vercel.app");
  });

  it("vaut le serveur local sans configuration", () => {
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it("construit des URL absolues et laisse intactes celles qui le sont déjà", () => {
    process.env.APP_URL = "https://shop.example.com";
    expect(absoluteUrl("/product/abc")).toBe("https://shop.example.com/product/abc");
    expect(absoluteUrl("/")).toBe("https://shop.example.com/");
    expect(absoluteUrl("https://images.openfoodfacts.org/a.jpg")).toBe("https://images.openfoodfacts.org/a.jpg");
  });
});
