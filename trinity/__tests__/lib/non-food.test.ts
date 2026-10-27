import { isNonFood, findRayonForCategories } from "@/lib/rayons";
import { computePrice } from "@/lib/pricing";
import { localImageFor } from "@/lib/product-images";

const price = (name: string, category: string, brand: string, quantity: string | null) =>
  computePrice(name, "3256225955244", [category], brand, quantity, new Map()).price / 1000;

describe("non-food aisles", () => {
  it("files hygiene and household categories in their own aisles", () => {
    expect(findRayonForCategories(["Lessives"])?.rayon.slug).toBe("entretien-maison");
    expect(findRayonForCategories(["Déodorants"])?.subCategory?.slug).toBe("deodorants");
    expect(isNonFood(["Hygiène dentaire"])).toBe(true);
    expect(isNonFood(["Pâtes alimentaires"])).toBe(false);
    expect(isNonFood([])).toBe(false);
  });

  it("prices products by their format, within believable bounds", () => {
    // Un dentifrice au litre, un bain de bouche bien moins cher au litre
    expect(price("Dentifrice protection", "Hygiène dentaire", "u", "75 ml")).toBeGreaterThan(1.5);
    expect(price("Bain de bouche soin complet", "Hygiène dentaire", "u", "500 ml")).toBeLessThan(6);
    // Un stick se paie bien plus cher au millilitre qu'un spray
    expect(price("Stick anti-transpirant", "Déodorants", "Rexona", "45 ml")).toBeGreaterThan(3);
    // Grand format plafonné, petit format au prix plancher du rayon
    expect(price("Lessive liquide", "Lessives", "Skip", "5 l")).toBeLessThanOrEqual(19.99);
    expect(price("Déodorant", "Déodorants", "u", "10 ml")).toBeGreaterThanOrEqual(1.29);
  });

  it("serves the local copy of a photo from the beauty and household databases", () => {
    expect(localImageFor("https://images.openbeautyfacts.org/images/products/871/052/241/7379/front_fr.12.400.jpg")).toBe(
      "/products/8710522417379.jpg"
    );
    expect(localImageFor("https://images.openproductsfacts.org/images/products/325/622/773/4337/front_fr.3.400.jpg")).toBe(
      "/products/3256227734337.jpg"
    );
  });
});
