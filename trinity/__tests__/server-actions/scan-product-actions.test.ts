/**
 * @jest-environment node
 */
import prisma from "@/lib/prisma";
import { findScannedProduct } from "@/lib/server-actions/scann-product-actions";
import { fetchOpenFoodFactsProduct } from "@/lib/open-food-facts";

jest.mock("@/lib/prisma", () => ({ product: { findUnique: jest.fn() } }));
jest.mock("@/lib/open-food-facts", () => ({ fetchOpenFoodFactsProduct: jest.fn() }));

const findProduct = prisma.product.findUnique as unknown as jest.Mock;
const fetchExternal = fetchOpenFoodFactsProduct as jest.Mock;
const BARCODE = "3256225955244";

describe("findScannedProduct", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

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

  it("reports an unknown product, even when Open Food Facts fails", async () => {
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
