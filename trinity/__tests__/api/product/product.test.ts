/**
 * @jest-environment node
 */
import {
  GET as getAllProducts,
  POST as createProduct,
} from "@/app/api/products/route";
import {
  GET as getProductById,
  DELETE as deleteProduct,
  PUT as updateProduct,
} from "@/app/api/products/[id]/route";
import { GET as getProductByBarcode } from "@/app/api/products/barcode/[barcode]/route";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isUserLoggedIn } from "@/services/auth/IsUserLoggedIn";
import { buildRequest } from "@/test-utils/requests";

jest.mock("@/lib/prisma", () => ({
  product: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

jest.mock("@/services/auth/IsUserLoggedIn", () => ({
  isUserLoggedIn: jest.fn(),
}));

// Contrôles d'accès simulés : autorisés par défaut, chaque test peut les refuser
jest.mock("@/services/auth/guards", () => ({
    isAdmin: jest.fn().mockResolvedValue(true),
    canAccessUser: jest.fn().mockResolvedValue(true),
    canAccessOrder: jest.fn().mockResolvedValue(true),
    canAccessCart: jest.fn().mockResolvedValue(true),
}));

describe("API: /api/products", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return all products successfully", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const mockProducts = [
        {
          id: "1",
          name: "Product 1",
          price: 10,
          description: "A product",
          picture: "http://example.com/image1.png",
          nutriScore: "A",
          brand: { name: "Brand A" },
          category: { name: "Category X" },
        },
      ];
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

      const jsonMock = jest.spyOn(NextResponse, "json");

      await getAllProducts();

      expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
      expect(jsonMock).toHaveBeenCalledWith({ data: mockProducts });
    });

    it("should return 500 on database error", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      (prisma.product.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const jsonMock = jest.spyOn(NextResponse, "json");

      await getAllProducts();

      expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    });
  });

  describe("POST", () => {
    it("should create a product with valid data", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const mockProduct = {
        id: "1",
        name: "New Product",
        price: 20,
        description: "A new product",
        nutriScore: "B",
        picture: "http://example.com/image.png",
        barCode: BigInt("1234567890123"),
        brandId: "brand-1-uuid",
        categoryId: "category-1-uuid",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products", {
        method: "POST",
        body: {
          name: "New Product",
          price: 20,
          description: "A new product",
          nutriScore: "B",
          picture: "http://example.com/image.png",
          barCode: "1234567890123",
          brandId: "brand-1-uuid",
          categoryId: "category-1-uuid",
        },
      });

      await createProduct(req);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: "New Product",
          price: 20,
          description: "A new product",
          nutriScore: "B",
          picture: "http://example.com/image.png",
          barCode: BigInt("1234567890123"),
          brand: {
            connect: { id: "brand-1-uuid" },
          },
          categories: {
            create: { category: { connect: { id: "category-1-uuid" } } },
          },
        },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          picture: true,
          nutriScore: true,
          barCode: true,
          brand: {
            select: {
              name: true,
            },
          },
          categories: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(jsonMock).toHaveBeenCalledWith(
        { data: { ...mockProduct, barCode: mockProduct.barCode.toString() } },
        { status: 201 }
      );
    });

    it("should return 400 if required fields are missing", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products", {
        method: "POST",
        body: {
          name: "Incomplete Product",
          price: 20,
        },
      });

      await createProduct(req);

      expect(prisma.product.create).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        {
          error: "Tous les champs sont obligatoires",
        },
        { status: 400 }
      );
    });

    it.each(["invalid-barcode", "-123", "12.5", "123456789012345", -123])(
      "should return 400 if barCode is invalid (%s)",
      async (barCode) => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const jsonMock = jest.spyOn(NextResponse, "json");

        const req = buildRequest("/api/products", {
          method: "POST",
          body: {
            name: "Invalid BarCode Product",
            price: 25,
            description: "Product with invalid barCode",
            nutriScore: "C",
            picture: "http://example.com/image.png",
            barCode,
            brandId: "brand-1-uuid",
            categoryId: "category-1-uuid",
          },
        });

        await createProduct(req);

        expect(prisma.product.create).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith(
          { error: "Le champ barCode doit être un nombre valide" },
          { status: 400 }
        );
      }
    );

    it("should return 409 if barCode already exists", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products", {
        method: "POST",
        body: {
          name: "Existing Product",
          price: 30,
          description: "A product that already exists",
          nutriScore: "A",
          picture: "http://example.com/image.png",
          barCode: "1234567890123",
          brandId: "brand-1-uuid",
          categoryId: "category-1-uuid",
        },
      });

      (prisma.product.create as jest.Mock).mockRejectedValue({
        code: "P2002",
        meta: { target: ["barCode"] },
      });

      await createProduct(req);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: "Existing Product",
          price: 30,
          description: "A product that already exists",
          nutriScore: "A",
          picture: "http://example.com/image.png",
          barCode: BigInt("1234567890123"),
          brand: {
            connect: { id: "brand-1-uuid" },
          },
          categories: {
            create: { category: { connect: { id: "category-1-uuid" } } },
          },
        },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          picture: true,
          nutriScore: true,
          barCode: true,
          brand: {
            select: {
              name: true,
            },
          },
          categories: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Un produit avec ce barCode existe déjà." },
        { status: 409 }
      );
    });

    it("should return 400 if brandId or categoryId is invalid", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products", {
        method: "POST",
        body: {
          name: "Invalid Relation Product",
          price: 35,
          description: "Product with invalid brandId",
          nutriScore: "B",
          picture: "http://example.com/image.png",
          barCode: "9876543210987",
          brandId: "invalid-brand-uuid",
          categoryId: "category-1-uuid",
        },
      });

      (prisma.product.create as jest.Mock).mockRejectedValue({
        code: "P2003",
      });

      await createProduct(req);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: "Invalid Relation Product",
          price: 35,
          description: "Product with invalid brandId",
          nutriScore: "B",
          picture: "http://example.com/image.png",
          barCode: BigInt("9876543210987"),
          brand: {
            connect: { id: "invalid-brand-uuid" },
          },
          categories: {
            create: { category: { connect: { id: "category-1-uuid" } } },
          },
        },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          picture: true,
          nutriScore: true,
          barCode: true,
          brand: {
            select: {
              name: true,
            },
          },
          categories: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(jsonMock).toHaveBeenCalledWith(
        { error: "brandId ou categoryId invalide." },
        { status: 400 }
      );
    });

    it("should return 500 on unexpected database errors", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products", {
        method: "POST",
        body: {
          name: "New Product",
          price: 40,
          description: "A new product",
          nutriScore: "C",
          picture: "http://example.com/image.png",
          barCode: "1122334455667",
          brandId: "brand-1-uuid",
          categoryId: "category-1-uuid",
        },
      });

      (prisma.product.create as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      await createProduct(req);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: "New Product",
          price: 40,
          description: "A new product",
          nutriScore: "C",
          picture: "http://example.com/image.png",
          barCode: BigInt("1122334455667"),
          brand: {
            connect: { id: "brand-1-uuid" },
          },
          categories: {
            create: { category: { connect: { id: "category-1-uuid" } } },
          },
        },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          picture: true,
          nutriScore: true,
          barCode: true,
          brand: {
            select: {
              name: true,
            },
          },
          categories: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    });

    it("should return 401 if user is not logged in", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

      const req = buildRequest("/api/products", { method: "POST" });
      const jsonMock = jest.spyOn(NextResponse, "json");

      await createProduct(req);

      expect(prisma.product.create).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });
  });
});

describe("API: /api/products/[id]", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return a product by ID", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const mockProduct = {
        id: "1",
        name: "Product 1",
        price: 10,
        description: "A product",
        nutriScore: "A",
      };
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/1");
      const params = { id: "1" };

      await getProductById(req, { params: Promise.resolve(params) });

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
      });
      expect(jsonMock).toHaveBeenCalledWith({ data: mockProduct });
    });

    it("should return 404 if product is not found", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/2");
      const params = { id: "2" };

      await getProductById(req, { params: Promise.resolve(params) });

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: "2" },
      });
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Product not found" },
        { status: 404 }
      );
    });

    it("should return 500 on database error", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      (prisma.product.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/1");
      const params = { id: "1" };

      await getProductById(req, { params: Promise.resolve(params) });

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
      });
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    });

    it("should return 400 if product ID is not provided", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/");
      const params = { id: "" }; // identifiant absent

      await getProductById(req, {
        params: Promise.resolve(params),
      });

      expect(prisma.product.findUnique).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Product ID is required" },
        { status: 400 }
      );
    });

    it("should return 401 if user is not logged in", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

      const req = buildRequest("/api/products/1");
      const jsonMock = jest.spyOn(NextResponse, "json");

      await getProductById(req, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(prisma.product.findUnique).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });
  });

  describe("DELETE", () => {
    it("should delete a product by ID", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const mockProduct = { id: "1" };
      (prisma.product.delete as jest.Mock).mockResolvedValue(mockProduct);

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/1", { method: "DELETE" });
      const params = { id: "1" };

      await deleteProduct(req, { params: Promise.resolve(params) });

      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: "1" },
      });
      expect(jsonMock).toHaveBeenCalledWith({ message: "Product deleted" });
    });

    it("should return 404 if product is not found", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      (prisma.product.delete as jest.Mock).mockResolvedValue(null);

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/2", { method: "DELETE" });
      const params = { id: "2" };

      await deleteProduct(req, { params: Promise.resolve(params) });

      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: "2" },
      });
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Product not found" },
        { status: 404 }
      );
    });

    it("should return 500 on database error", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      (prisma.product.delete as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/1", { method: "DELETE" });
      const params = { id: "1" };

      await deleteProduct(req, { params: Promise.resolve(params) });

      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: "1" },
      });
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    });

    it("should return 400 if product ID is not provided", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/", { method: "DELETE" });
      const params = { id: "" }; // identifiant absent

      await deleteProduct(req, {
        params: Promise.resolve(params),
      });

      expect(prisma.product.delete).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Product ID is required" },
        { status: 400 }
      );
    });

    it("should return 401 if user is not logged in", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

      const req = buildRequest("/api/products/1", { method: "DELETE" });
      const jsonMock = jest.spyOn(NextResponse, "json");

      await deleteProduct(req, { params: Promise.resolve({ id: "1" }) });

      expect(prisma.product.delete).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });
  });

  describe("PUT", () => {
    it("should update a product by ID", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const mockProduct = {
        id: "1",
        name: "Updated Product",
        price: 30,
        description: "Updated description",
        nutriScore: "C",
      };
      (prisma.product.update as jest.Mock).mockResolvedValue(mockProduct);

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/1", {
        method: "PUT",
        body: {
          name: "Updated Product",
          price: 30,
          description: "Updated description",
          nutriScore: "C",
        },
      });

      const params = { id: "1" };

      await updateProduct(req, { params: Promise.resolve(params) });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: {
          name: "Updated Product",
          price: 30,
          description: "Updated description",
          nutriScore: "C",
        },
      });
      expect(jsonMock).toHaveBeenCalledWith(
        { data: mockProduct },
        { status: 200 }
      );
    });

    it("should return 400 if required fields are missing", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/1", {
        method: "PUT",
        body: { name: "Incomplete Product" },
      });

      const params = { id: "1" };

      await updateProduct(req, { params: Promise.resolve(params) });

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        {
          error:
            "Missing required fields: name, price, description, or nutriScore",
        },
        { status: 400 }
      );
    });

    it("should return 500 on database error", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      (prisma.product.update as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/1", {
        method: "PUT",
        body: {
          name: "Updated Product",
          price: 30,
          description: "Updated description",
          nutriScore: "C",
        },
      });

      const params = { id: "1" };

      await updateProduct(req, { params: Promise.resolve(params) });

      expect(prisma.product.update).toHaveBeenCalledTimes(1);
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    });

    it("should return 400 if product ID is missing", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/", {
        method: "PUT",
        body: { name: "Incomplete Product" },
      });

      const params = { id: "" }; // identifiant absent

      await updateProduct(req, {
        params: Promise.resolve(params),
      });

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Product ID is required" },
        { status: 400 }
      );
    });

    it("should handle BigInt fields correctly when fetching a product by ID", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const mockProduct = {
        id: "1",
        name: "Product 1",
        price: BigInt(10000),
        description: "A product",
        nutriScore: "A",
      };
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/1");
      const params = { id: "1" };

      await getProductById(req, { params: Promise.resolve(params) });

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
      });
      expect(jsonMock).toHaveBeenCalledWith({
        data: {
          id: "1",
          name: "Product 1",
          price: "10000",
          description: "A product",
          nutriScore: "A",
        },
      });
    });

    it("should return 401 if user is not logged in", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

      const req = buildRequest("/api/products/1", { method: "PUT" });
      const jsonMock = jest.spyOn(NextResponse, "json");

      await updateProduct(req, { params: Promise.resolve({ id: "1" }) });

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });
  });
  describe("GET /api/products/byBarcode", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should return 400 if the barcode is missing", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/barcode/");
      const params = Promise.resolve({ barcode: "" }); // code-barres absent

      await getProductByBarcode(req, { params });

      expect(prisma.product.findFirst).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Product barcode is required" },
        { status: 400 }
      );
    });

    it.each(["abc", "12.5", "-123", "123456789012345"])(
      "should return 400 for the invalid barcode %s",
      async (barcode) => {
        (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
        const jsonMock = jest.spyOn(NextResponse, "json");

        const req = buildRequest(`/api/products/barcode/${barcode}`);
        const params = Promise.resolve({ barcode });

        await getProductByBarcode(req, { params });

        expect(prisma.product.findFirst).not.toHaveBeenCalled();
        expect(jsonMock).toHaveBeenCalledWith(
          { error: "Invalid product barcode" },
          { status: 400 }
        );
      }
    );

    it("should return 404 if the product is not found", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const req = buildRequest("/api/products/barcode/123456789");
      const params = Promise.resolve({ barcode: "123456789" });

      await getProductByBarcode(req, { params });

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { barCode: BigInt(123456789) },
      });
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Product not found" },
        { status: 404 }
      );
    });

    it("should return the product data if found", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const mockProduct = {
        id: "1",
        name: "Test Product",
        barCode: BigInt(987654321),
        price: 19.99,
        description: "Product description",
        nutriScore: "A",
      };
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/barcode/987654321");
      const params = Promise.resolve({ barcode: "987654321" });

      await getProductByBarcode(req, { params });

      const expectedProductData = {
        ...mockProduct,
        barCode: mockProduct.barCode.toString(),
      };

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { barCode: BigInt(987654321) },
      });
      expect(jsonMock).toHaveBeenCalledWith({ data: expectedProductData });
    });

    it("should handle BigInt fields correctly in the response", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const mockProduct = {
        id: "1",
        name: "Test Product",
        barCode: BigInt(123456789),
        price: 29.99,
        description: "Another product description",
        nutriScore: "B",
      };
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);

      const jsonMock = jest.spyOn(NextResponse, "json");

      const req = buildRequest("/api/products/barcode/123456789");
      const params = Promise.resolve({ barcode: "123456789" });

      await getProductByBarcode(req, { params });

      const expectedProductData = {
        ...mockProduct,
        barCode: mockProduct.barCode.toString(),
      };

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { barCode: BigInt(123456789) },
      });
      expect(jsonMock).toHaveBeenCalledWith({ data: expectedProductData });
    });

    it("should return 500 in case of an internal server error", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(true);
      const jsonMock = jest.spyOn(NextResponse, "json");
      (prisma.product.findFirst as jest.Mock).mockRejectedValue(
        new Error("Database Error")
      );

      const req = buildRequest("/api/products/barcode/111222333");
      const params = Promise.resolve({ barcode: "111222333" });

      await getProductByBarcode(req, { params });

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { barCode: BigInt(111222333) },
      });
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    });

    it("should return 401 if user is not logged in", async () => {
      (isUserLoggedIn as jest.Mock).mockResolvedValue(false);

      const req = buildRequest("/api/products/barcode/123456789");
      const jsonMock = jest.spyOn(NextResponse, "json");
      const params = Promise.resolve({ barcode: "123456789" });

      await getProductByBarcode(req, { params });

      expect(prisma.product.findFirst).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 }
      );
    });
  });
});
