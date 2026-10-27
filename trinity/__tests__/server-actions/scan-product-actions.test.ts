/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { findScannedProduct } from "@/lib/server-actions/scann-product-actions";
import { fetchCategoryTaxonomy, fetchOpenFoodFactsProduct } from "@/lib/open-food-facts";
import { currentStore } from "@/lib/current-store";

jest.mock("@/lib/prisma", () => ({
  product: { findUnique: jest.fn(), findMany: jest.fn() },
  categoriesProducts: { groupBy: jest.fn() },
  prospectusItem: { findMany: jest.fn() },
}));
jest.mock("@/lib/open-food-facts", () => ({
  ...jest.requireActual<object>("@/lib/open-food-facts"),
  fetchOpenFoodFactsProduct: jest.fn(),
  fetchCategoryTaxonomy: jest.fn(),
}));
jest.mock("@/lib/current-store", () => ({ currentStore: jest.fn() }));

const findProduct = prisma.product.findUnique as unknown as jest.Mock;
const findProducts = prisma.product.findMany as unknown as jest.Mock;
const groupCategories = prisma.categoriesProducts.groupBy as unknown as jest.Mock;
const findPromotions = prisma.prospectusItem.findMany as unknown as jest.Mock;
const fetchExternal = fetchOpenFoodFactsProduct as unknown as jest.Mock<Promise<unknown>, [string, unknown, string]>;
const fetchTaxonomy = fetchCategoryTaxonomy as unknown as jest.Mock;
const getStore = currentStore as unknown as jest.Mock;
const BARCODE = "3017620422003";

const catalogProduct = (id: string, name: string) => ({
  id,
  name,
  picture: `/${id}.jpg`,
  price: 3290,
  regularPrice: null,
  netContent: "400 g",
  brand: { name: "u" },
});

describe("findScannedProduct", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    findProduct.mockResolvedValue(null);
    fetchTaxonomy.mockResolvedValue({});
    groupCategories.mockResolvedValue([]);
    findProducts.mockResolvedValue([]);
    findPromotions.mockResolvedValue([]);
    getStore.mockResolvedValue({ id: "s1" });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    [findProduct, findProducts, groupCategories, findPromotions, fetchExternal, fetchTaxonomy, getStore].forEach((mock) => mock.mockReset());
  });

  it("returns the catalogue product to open, without throwing a redirect", async () => {
    findProduct.mockResolvedValue({ id: "p1" });
    await expect(findScannedProduct(BARCODE)).resolves.toEqual({ kind: "catalog", productId: "p1" });
    expect(findProduct).toHaveBeenCalledWith({ where: { barCode: BigInt(BARCODE) }, select: { id: true } });
    expect(fetchExternal).not.toHaveBeenCalled();
  });

  it("describes a product the drive does not sell, with the closest catalogue products of its most precise category first", async () => {
    fetchExternal.mockResolvedValue({
      product_name_fr: "Nutella pâte à tartiner noisettes et cacao 400 g",
      brands: "Nutella,Ferrero",
      nutriscore_grade: "e",
      categories_tags: ["en:spreads", "en:sweet-spreads", "en:cocoa-and-hazelnuts-spreads"],
    });
    fetchTaxonomy.mockResolvedValue({
      "en:sweet-spreads": { name: { fr: "Produits à tartiner sucrés" } },
      "en:cocoa-and-hazelnuts-spreads": { name: { fr: "Pâtes à tartiner aux noisettes et au cacao" } },
    });
    groupCategories.mockResolvedValue([
      { categoryName: "Produits à tartiner sucrés", _count: { _all: 40 } },
      { categoryName: "Pâtes à tartiner aux noisettes et au cacao", _count: { _all: 3 } },
    ]);
    findProducts
      .mockResolvedValueOnce([
        catalogProduct("a", "Crème de marrons"),
        catalogProduct("b", "Pâte à tartiner U Bio"),
        catalogProduct("c", "Pâte à tartiner noisettes U"),
      ])
      .mockResolvedValueOnce([catalogProduct("d", "Confiture de fraises"), catalogProduct("e", "Miel de fleurs")]);

    const result = await findScannedProduct(BARCODE);
    expect(result).toMatchObject({
      kind: "external",
      product: { barCode: BARCODE, name: "Pâte à tartiner noisettes et cacao", brand: "Nutella", nutriScore: "E", source: "Open Food Facts" },
      rayon: { name: "Pâtes à tartiner", href: "/rayon/epicerie-sucree?cat=pates-a-tartiner" },
    });
    if (result.kind !== "external") throw new Error("produit attendu");
    // Le plus de mots en commun avec « Pâte à tartiner noisettes et cacao » d'abord
    expect(result.similar.map((item) => item.id)).toEqual(["c", "b", "a", "d"]);
    expect(result.similar[0]).toEqual({ id: "c", name: "Pâte à tartiner noisettes U", picture: "/c.jpg", price: 3290, regularPrice: null, netContent: "400 g", brand: "u" });

    // La catégorie la plus précise d'abord, sans reprendre les produits déjà proposés, en stock dans le magasin
    const [first, second] = findProducts.mock.calls.map(([query]) => (query as { where: { AND: unknown[] }; take: number }));
    expect(first.where.AND).toEqual(
      expect.arrayContaining([
        { categories: { some: { categoryName: "Pâtes à tartiner aux noisettes et au cacao" } } },
        { stocks: { some: { storeId: "s1", quantity: { gt: 0 } } } },
      ])
    );
    expect(second.where.AND).toEqual(
      expect.arrayContaining([{ categories: { some: { categoryName: "Produits à tartiner sucrés" } } }, { id: { notIn: ["c", "b", "a"] } }])
    );
    expect(second.take).toBe(24);
  });

  it("puts products of the same brand first when names are as close", async () => {
    fetchExternal.mockResolvedValue({ product_name_fr: "Blue Lavender", brands: "Axe", categories_tags: ["en:deodorants"] });
    groupCategories.mockResolvedValue([{ categoryName: "Déodorants", _count: { _all: 14 } }]);
    findProducts.mockResolvedValue([
      { ...catalogProduct("a", "Déodorant Fleur de coton"), brand: { name: "Monsavon" } },
      { ...catalogProduct("b", "Déodorant Dark Temptation"), brand: { name: "AXE" } },
    ]);
    const result = await findScannedProduct(BARCODE);
    expect(result).toMatchObject({ kind: "external", rayon: { name: "Déodorants", href: "/rayon/hygiene-beaute?cat=deodorants" } });
    if (result.kind !== "external") throw new Error("produit attendu");
    expect(result.similar.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("looks up the beauty and household databases for a non-food product", async () => {
    fetchExternal.mockImplementation(async (_code: string, _init: unknown, base: string) =>
      base === "products" ? { product_name_fr: "Lessive liquide", categories_tags: ["en:laundry-detergents"] } : null
    );
    await expect(findScannedProduct(BARCODE)).resolves.toMatchObject({
      kind: "external",
      product: { name: "Lessive liquide", nonFood: true, source: "Open Products Facts" },
      similar: [],
      rayon: null,
    });
    expect(fetchExternal.mock.calls.map((call) => call[2])).toEqual(["food", "beauty", "products"]);
  });

  it("still describes the product when the catalogue alternatives fail", async () => {
    fetchExternal.mockResolvedValue({ product_name_fr: "Biscuits sablés", categories_tags: ["en:biscuits"] });
    groupCategories.mockRejectedValue(new Error("base indisponible"));
    await expect(findScannedProduct(BARCODE)).resolves.toMatchObject({ kind: "external", product: { name: "Biscuits sablés" }, similar: [], rayon: null });
    expect(fetchExternal).toHaveBeenCalledTimes(1);
  });

  it("reports an unknown product, even when the databases fail", async () => {
    fetchExternal.mockResolvedValue(null);
    await expect(findScannedProduct(BARCODE)).resolves.toEqual({ kind: "unknown" });
    fetchExternal.mockRejectedValue(new Error("Open Food Facts a répondu 503"));
    await expect(findScannedProduct(BARCODE)).resolves.toEqual({ kind: "unknown" });
  });

  it("refuses a code that is not a product barcode, such as a QR code", async () => {
    await expect(findScannedProduct("https://example.com")).resolves.toEqual({ kind: "invalid" });
    expect(findProduct).not.toHaveBeenCalled();
  });
});
