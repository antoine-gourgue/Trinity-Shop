/**
 * @jest-environment node
 */
import { SeoProduct, productDescription, productJsonLd, serializeJsonLd } from "@/lib/product-seo";

const yaourt: SeoProduct = {
  id: "prod1",
  name: "Yaourt nature",
  price: 1950,
  picture: "https://images.openfoodfacts.org/images/products/325/622/123/4567/front_fr.jpg",
  barCode: BigInt("3256221234567"),
  netContent: "4 x 125 g",
  nutriScore: "A",
  brand: { name: "u-bio" },
  stock: { quantity: 12 },
};

describe("productJsonLd", () => {
  const original = { ...process.env };

  beforeAll(() => {
    process.env.APP_URL = "https://shop.example.com";
  });

  afterAll(() => {
    process.env = original;
  });

  it("décrit le produit et son offre en euros", () => {
    expect(productJsonLd(yaourt, { description: "Yaourt au lait entier" })).toEqual({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Yaourt nature",
      url: "https://shop.example.com/product/prod1",
      sku: "prod1",
      description: "Yaourt au lait entier",
      image: [yaourt.picture],
      brand: { "@type": "Brand", name: "U Bio" },
      gtin13: "3256221234567",
      offers: {
        "@type": "Offer",
        url: "https://shop.example.com/product/prod1",
        price: "1.95",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: "Trinity Shop" },
      },
    });
  });

  it("convertit les millièmes d'euro au centime", () => {
    expect(productJsonLd({ ...yaourt, price: 5900 }).offers.price).toBe("5.90");
    expect(productJsonLd({ ...yaourt, price: 12000 }).offers.price).toBe("12.00");
  });

  it("choisit la propriété GTIN selon la longueur du code-barres", () => {
    expect(productJsonLd({ ...yaourt, barCode: BigInt("40084107") })).toMatchObject({ gtin8: "40084107" });
    // EAN-13 commençant par 0 : le zéro est perdu en base, il reste un GTIN-12 équivalent
    expect(productJsonLd({ ...yaourt, barCode: BigInt("0123456789012") })).toMatchObject({ gtin12: "123456789012" });
    const odd = productJsonLd({ ...yaourt, barCode: "12345" });
    expect(odd).not.toHaveProperty("gtin8");
    expect(odd).not.toHaveProperty("gtin13");
  });

  it("signale la rupture de stock et omet les champs absents", () => {
    const jsonLd = productJsonLd({ ...yaourt, stock: null, picture: "", brand: null });
    expect(jsonLd.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(jsonLd).not.toHaveProperty("image");
    expect(jsonLd).not.toHaveProperty("brand");
    expect(jsonLd).not.toHaveProperty("description");
  });

  it("rend absolue une photo servie par le site", () => {
    expect(productJsonLd({ ...yaourt, picture: "/products/3256221234567.jpg" }).image).toEqual([
      "https://shop.example.com/products/3256221234567.jpg",
    ]);
  });
});

describe("serializeJsonLd", () => {
  it("échappe « < » pour qu'une valeur ne puisse pas fermer la balise <script>", () => {
    const json = serializeJsonLd(productJsonLd({ ...yaourt, name: "</script><script>alert(1)</script>" }));
    expect(json).not.toContain("<");
    expect(json).toContain("\\u003c/script>");
    expect((JSON.parse(json) as { name: string }).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("productDescription", () => {
  it("résume le produit, sa marque, son prix et son Nutri-Score", () => {
    expect(productDescription(yaourt)).toMatch(
      /^Yaourt nature \(4 x 125 g\), marque U Bio, à 1,95\s€\. Nutri-Score A\. Commandez sur Trinity Shop/
    );
  });

  it("omet la contenance, la marque et le Nutri-Score inconnus", () => {
    expect(productDescription({ ...yaourt, netContent: null, brand: null, nutriScore: null })).toMatch(
      /^Yaourt nature, à 1,95\s€\. Commandez sur Trinity Shop/
    );
  });
});
