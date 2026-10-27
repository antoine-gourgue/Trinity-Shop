/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { findScannedProduct } from "@/lib/server-actions/scann-product-actions";
import { fetchOpenFoodFactsProduct } from "@/lib/open-food-facts";

jest.mock("@/lib/prisma", () => ({ product: { findUnique: jest.fn() } }));
jest.mock("@/lib/open-food-facts", () => ({ fetchOpenFoodFactsProduct: jest.fn() }));

const findProduct = prisma.product.findUnique as unknown as jest.Mock;
const fetchExternal = fetchOpenFoodFactsProduct as unknown as jest.Mock<Promise<unknown>, [string, unknown, string]>;
const BARCODE = "3256225955244";

describe("findScannedProduct", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => undefined));
  afterEach(() => {
    jest.restoreAllMocks();
    fetchExternal.mockReset();
  });

  it("returns the catalogue product to open, without throwing a redirect", async () => {
    findProduct.mockResolvedValue({ id: "p1" });
    await expect(findScannedProduct(BARCODE)).resolves.toEqual({ kind: "catalog", productId: "p1" });
    expect(findProduct).toHaveBeenCalledWith({ where: { barCode: BigInt(BARCODE) }, select: { id: true } });
    expect(fetchExternal).not.toHaveBeenCalled();
  });

  it("describes a product the drive does not sell with Open Food Facts", async () => {
    findProduct.mockResolvedValue(null);
    fetchExternal.mockResolvedValue({ product_name: "Biscuits" });
    await expect(findScannedProduct(BARCODE)).resolves.toEqual({ kind: "external", product: { product_name: "Biscuits" } });
  });

  it("looks up the beauty and household databases for a non-food product", async () => {
    findProduct.mockResolvedValue(null);
    fetchExternal.mockImplementation(async (_code: string, _init: unknown, base: string) => (base === "products" ? { product_name: "Lessive" } : null));
    await expect(findScannedProduct(BARCODE)).resolves.toEqual({ kind: "external", product: { product_name: "Lessive" } });
    expect(fetchExternal.mock.calls.map((call) => call[2])).toEqual(["food", "beauty", "products"]);
  });

  it("reports an unknown product, even when the databases fail", async () => {
    findProduct.mockResolvedValue(null);
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
