import { catalogCategoriesFor, toScannedProduct } from "@/lib/scanned-product";
import { cleanProductName, decodeHtmlEntities } from "@/lib/open-food-facts-mapping";

describe("decodeHtmlEntities", () => {
  it("decodes the entities left in some Open Food Facts names", () => {
    expect(decodeHtmlEntities("Madeleines &quot;coquilles&quot;")).toBe('Madeleines "coquilles"');
    expect(decodeHtmlEntities("Ben &amp; Jerry&#39;s &#x2013; Cookie")).toBe("Ben & Jerry's – Cookie");
    // Ce qui n'est pas une entité connue reste tel quel
    expect(decodeHtmlEntities("Sel & poivre &foo; &#0;")).toBe("Sel & poivre &foo; &#0;");
  });

  it("is applied before the name is cleaned", () => {
    expect(cleanProductName("Madeleines &quot;coquilles&quot;", ["U"])).toBe('Madeleines "coquilles"');
  });
});

describe("toScannedProduct", () => {
  it("prepares a food product the way catalogue products are shown, the brand apart", () => {
    const product = toScannedProduct(
      "3017620422003",
      {
        product_name_fr: "Pâte à tartiner Nutella 400 g",
        brands: "Nutella, Ferrero",
        generic_name_fr: "Pâte à tartiner aux noisettes et au cacao",
        quantity: " 400 g ",
        nutriscore_grade: "e",
        image_front_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.jpg",
        ingredients_text_fr: "Sucre, huile de palme, _lait_ écrémé en poudre",
        allergens_tags: ["en:milk"],
        nutriments: { "energy-kcal_100g": 539 },
      },
      "food"
    );
    expect(product).toMatchObject({
      barCode: "3017620422003",
      name: "Pâte à tartiner",
      brand: "Nutella",
      quantity: "400 g",
      nutriScore: "E",
      description: "Pâte à tartiner aux noisettes et au cacao",
      ingredients: "Sucre, huile de palme, _lait_ écrémé en poudre",
      allergens: ["Lait"],
      origins: null,
      nonFood: false,
      source: "Open Food Facts",
    });
    expect(product.picture).toMatch(/^https:\/\/images\.openfoodfacts\.org\//);
    expect(product.nutrition.length).toBeGreaterThan(0);
  });

  it("drops what a non-food product cannot have, and pictures from unknown hosts", () => {
    const product = toScannedProduct(
      "8710847922374",
      {
        product_name: "Assouplissant",
        generic_name: "Assouplissant concentré",
        nutriscore_grade: "unknown",
        image_front_url: "https://example.com/photo.jpg",
        allergens_tags: ["en:milk"],
        nutriments: { "energy-kcal_100g": 1 },
      },
      "products"
    );
    // Un libellé d'un seul mot laisse la place à la dénomination générique
    expect(product).toMatchObject({
      name: "Assouplissant concentré",
      brand: null,
      picture: null,
      nutriScore: null,
      allergens: [],
      nutrition: [],
      nonFood: true,
      source: "Open Products Facts",
    });
  });

  it("drops the metrological e some contributors add to the quantity", () => {
    expect(toScannedProduct("1", { quantity: "370 g e" }, "food").quantity).toBe("370 g");
    expect(toScannedProduct("1", { quantity: "1 L ℮" }, "food").quantity).toBe("1 L");
    expect(toScannedProduct("1", { quantity: "6 x 125 g" }, "food").quantity).toBe("6 x 125 g");
  });

  it("names a product without a name after its description", () => {
    expect(toScannedProduct("1", { generic_name: "Eau minérale" }, "food").name).toBe("Eau minérale");
    expect(toScannedProduct("1", {}, "food").name).toBe("Produit sans nom");
  });
});

describe("catalogCategoriesFor", () => {
  const site = ["Produits à tartiner sucrés", "Déodorants", "Biscuits"];

  it("matches tags by their French name, or by the tag itself", () => {
    const taxonomy = { "en:sweet-spreads": { name: { fr: "Produits à tartiner sucrés" } } };
    expect(catalogCategoriesFor(["en:spreads", "en:sweet-spreads", "en:deodorants", "fr:deodorants"], taxonomy, site)).toEqual([
      "Produits à tartiner sucrés",
      "Déodorants",
    ]);
    expect(catalogCategoriesFor(["en:laundry-detergents"], {}, site)).toEqual([]);
  });
});
