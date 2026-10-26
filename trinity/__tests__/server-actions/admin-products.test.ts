/**
 * @jest-environment node
 */
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { computePrice } from "@/lib/pricing";
import { AccessDeniedError, requireAdmin } from "@/services/auth/guards";
import { createProduct, lookupProductBarcode, type NewProductInput } from "@/lib/server-actions/admin-actions";

jest.mock("@/lib/prisma", () => ({
    product: { findUnique: jest.fn(), create: jest.fn() },
    category: { findMany: jest.fn() },
    brand: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    categoriesProducts: { groupBy: jest.fn() },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

// Administrateur connecté par défaut ; chaque test peut refuser l'accès
jest.mock("@/services/auth/guards", () => {
    const actual = jest.requireActual<typeof import("@/services/auth/guards")>("@/services/auth/guards");
    return { AccessDeniedError: actual.AccessDeniedError, requireAdmin: jest.fn(), currentAccess: jest.fn() };
});

// Vrai calcul des prix, observé pour vérifier ce que l'action lui transmet
jest.mock("@/lib/pricing", () => {
    const actual = jest.requireActual<typeof import("@/lib/pricing")>("@/lib/pricing");
    return { ...actual, computePrice: jest.fn(actual.computePrice) };
});

const actualPricing = jest.requireActual<typeof import("@/lib/pricing")>("@/lib/pricing");

const PHOTO = "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.879.400.jpg";

// Fiche Open Food Facts telle que renvoyée par l'API v0
const NUTELLA = {
    code: "3017620422003",
    product_name_fr: "Nutella",
    generic_name_fr: "Pâte à tartiner aux noisettes et au cacao",
    brands: "Ferrero, Nutella",
    quantity: "400 g",
    image_front_url: PHOTO,
    nutriscore_grade: "e",
    categories_tags: ["en:breakfasts", "en:spreads", "en:sweet-spreads", "en:hazelnut-spreads"],
    // Champs d'un type inattendu : ignorés sans faire échouer la fiche
    allergens_tags: "en:nuts",
    nutriments: "inconnu",
};

// Entrées de la taxonomie des catégories (API v2, lc=fr)
const TAXONOMY = {
    "en:breakfasts": { name: { fr: "Petit-déjeuners" }, synonyms: { fr: ["Petit-déjeuners", "petits déjeuner"] } },
    "en:spreads": { name: { fr: "Produits à tartiner" }, parents: [] },
    "en:sweet-spreads": { name: { fr: "Produits à tartiner sucrés" }, synonyms: { fr: ["Produits à tartiner sucrés"] } },
    "en:hazelnut-spreads": { name: {} },
};

// Catégories du site : la casse diffère de la taxonomie pour « petit-déjeuners »
const SITE_CATEGORIES = ["Biscuits", "petit-déjeuners", "Produits à tartiner sucrés"];

const fetchMock = jest.spyOn(global, "fetch");

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const requestUrl = (input: string | URL | Request) => (input instanceof Request ? input.url : String(input));

// Réponses d'Open Food Facts : fiche produit (undefined = code inconnu) et taxonomie
function mockOpenFoodFacts({ product, taxonomy = TAXONOMY }: { product?: object; taxonomy?: object | Error }) {
    fetchMock.mockImplementation(async (input) => {
        if (requestUrl(input).includes("/api/v2/taxonomy")) {
            if (taxonomy instanceof Error) throw taxonomy;
            return json(taxonomy);
        }
        return json(product ? { status: 1, product } : { status: 0, status_verbose: "product not found" });
    });
}

function mockCatalog(brands = ["Nutella", "u-saveurs"]) {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.category.findMany as jest.Mock).mockResolvedValue(SITE_CATEGORIES.map((name) => ({ name })));
    (prisma.brand.findMany as jest.Mock).mockResolvedValue(brands.map((name) => ({ name })));
    (prisma.categoriesProducts.groupBy as jest.Mock).mockResolvedValue([
        { categoryName: "Produits à tartiner sucrés", _count: { _all: 12 } },
        { categoryName: "petit-déjeuners", _count: { _all: 40 } },
    ]);
}

beforeEach(() => {
    (requireAdmin as jest.Mock).mockResolvedValue(undefined);
    fetchMock.mockReset();
});

afterAll(() => {
    fetchMock.mockRestore();
});

describe("lookupProductBarcode", () => {
    it.each(["", "12ab", "123456789012345", "-3017620422003"])("rejects the invalid barcode %p", async (barcode) => {
        const result = await lookupProductBarcode(barcode);

        expect(result).toEqual({ ok: false, error: "Saisissez un code-barres de 1 à 14 chiffres." });
        expect(prisma.product.findUnique).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("points to the existing product when the barcode is already in the catalog", async () => {
        (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: "prod1", name: "Pâte à tartiner" });

        const result = await lookupProductBarcode(" 3017620422003 ");

        expect(prisma.product.findUnique).toHaveBeenCalledWith({
            where: { barCode: BigInt("3017620422003") },
            select: { id: true, name: true },
        });
        expect(result).toEqual({
            ok: false,
            error: "Ce code-barres est déjà au catalogue : « Pâte à tartiner ».",
            existing: { id: "prod1", name: "Pâte à tartiner" },
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("reports a barcode unknown to Open Food Facts", async () => {
        mockCatalog();
        mockOpenFoodFacts({ product: undefined });

        const result = await lookupProductBarcode("3017620422003");

        expect(requestUrl(fetchMock.mock.calls[0][0])).toBe("https://world.openfoodfacts.org/api/v0/product/3017620422003.json");
        expect(result).toEqual({ ok: false, error: "Ce code-barres est inconnu d'Open Food Facts." });
    });

    it("reports Open Food Facts being unavailable", async () => {
        mockCatalog();
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
        fetchMock.mockResolvedValue(json({ error: "busy" }, 503));

        const result = await lookupProductBarcode("3017620422003");

        expect(result).toEqual({ ok: false, error: "Open Food Facts ne répond pas. Réessayez dans quelques instants." });
        consoleError.mockRestore();
    });

    it("proposes a pre-filled product matched to the site categories", async () => {
        mockCatalog();
        mockOpenFoodFacts({ product: NUTELLA });

        const result = await lookupProductBarcode("3017620422003");

        // Étiquettes de la fiche demandées en français à l'API de taxonomie
        const taxonomyUrl = new URL(requestUrl(fetchMock.mock.calls[1][0]));
        expect(taxonomyUrl.pathname).toBe("/api/v2/taxonomy");
        expect(taxonomyUrl.searchParams.get("tags")).toBe(NUTELLA.categories_tags.join(","));
        expect(taxonomyUrl.searchParams.get("lc")).toBe("fr");

        const name = "Pâte à tartiner aux noisettes et au cacao";
        const categories = ["petit-déjeuners", "Produits à tartiner sucrés"];
        const counts = new Map([
            ["Produits à tartiner sucrés", 12],
            ["petit-déjeuners", 40],
        ]);
        expect(computePrice).toHaveBeenCalledWith(name, "3017620422003", categories, "Nutella", "400 g", counts);
        const expected = actualPricing.computePrice(name, "3017620422003", categories, "Nutella", "400 g", counts);

        expect(result).toEqual({
            ok: true,
            proposal: {
                barCode: "3017620422003",
                // Libellé réduit à la marque : la dénomination générique le remplace
                name,
                // Ferrero est un groupe : la marque du produit lui est préférée
                brand: "Nutella",
                netContent: "400 g",
                description: name,
                nutriScore: "E",
                picture: PHOTO,
                categories,
                price: expected.regularPrice ?? expected.price,
                hidden: false,
            },
        });
        expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it("suggests the shelf price rather than a promotion, in thousandths of a euro", async () => {
        mockCatalog();
        mockOpenFoodFacts({ product: NUTELLA });
        (computePrice as jest.Mock).mockReturnValueOnce({ price: 3790, regularPrice: 5590 });

        const result = await lookupProductBarcode("3017620422003");

        expect(result.ok && result.proposal.price).toBe(5590);
    });

    it("keeps a useful proposal without taxonomy nor photo, and reuses the brand already in the catalog", async () => {
        mockCatalog();
        mockOpenFoodFacts({
            product: {
                product_name: "MOUSSE CHOCOLAT NOIR U SAVEURS",
                brands: "U Saveurs",
                quantity: 4,
                image_front_url: "https://example.com/mousse.jpg",
                nutriscore_grade: "not-applicable",
                categories_tags: ["en:desserts"],
            },
            taxonomy: new Error("429 Too Many Requests"),
        });

        const result = await lookupProductBarcode("03256220000120");

        if (!result.ok) throw new Error(result.error);
        expect(result.proposal).toMatchObject({
            // Zéro de tête retiré, comme en base
            barCode: "3256220000120",
            // Marque et MAJUSCULES retirées du libellé
            name: "Mousse Chocolat Noir",
            // Marque déjà en base sous la forme d'un slug : reprise telle quelle
            brand: "u-saveurs",
            netContent: null,
            nutriScore: null,
            // Photo hors des serveurs d'Open Food Facts : écartée, et le produit proposé masqué
            picture: "",
            hidden: true,
            categories: [],
        });
    });

    it("is reserved to administrators", async () => {
        (requireAdmin as jest.Mock).mockRejectedValue(new AccessDeniedError());

        await expect(lookupProductBarcode("3017620422003")).rejects.toBeInstanceOf(AccessDeniedError);
        expect(prisma.product.findUnique).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("createProduct", () => {
    const input: NewProductInput = {
        barCode: "3017620422003",
        picture: PHOTO,
        name: "Pâte à tartiner aux noisettes et au cacao",
        brand: "Nutella",
        price: 4.59,
        regularPrice: null,
        netContent: "400 g",
        description: "Pâte à tartiner aux noisettes et au cacao",
        nutriScore: "E",
        categories: ["Produits à tartiner sucrés", "Catégorie supprimée"],
        hidden: false,
        stock: 120,
    };

    beforeEach(() => {
        (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.category.findMany as jest.Mock).mockResolvedValue([{ name: "Produits à tartiner sucrés" }]);
        (prisma.brand.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.brand.create as jest.Mock).mockResolvedValue({ id: "brand1" });
        (prisma.product.create as jest.Mock).mockResolvedValue({ id: "prod1" });
    });

    it("creates the product with its new brand, its categories and its initial stock", async () => {
        const result = await createProduct(input);

        expect(result).toEqual({ ok: true, id: "prod1" });
        expect(prisma.category.findMany).toHaveBeenCalledWith({
            where: { name: { in: ["Produits à tartiner sucrés", "Catégorie supprimée"] } },
            select: { name: true },
        });
        expect(prisma.brand.create).toHaveBeenCalledWith({ data: { name: "Nutella" }, select: { id: true } });
        expect(prisma.product.create).toHaveBeenCalledWith({
            data: {
                name: "Pâte à tartiner aux noisettes et au cacao",
                barCode: BigInt("3017620422003"),
                picture: PHOTO,
                brandId: "brand1",
                // Prix saisis en euros, stockés en millièmes d'euro
                price: 4590,
                regularPrice: null,
                netContent: "400 g",
                description: "Pâte à tartiner aux noisettes et au cacao",
                nutriScore: "E",
                hidden: false,
                // Seules les catégories connues du site sont rattachées
                categories: { create: [{ category: { connect: { name: "Produits à tartiner sucrés" } } }] },
                stock: { create: { quantity: 120 } },
            },
            select: { id: true },
        });
        expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
    });

    it("reuses an existing brand and stores a promotion", async () => {
        (prisma.brand.findFirst as jest.Mock).mockResolvedValue({ id: "brand-nutella" });

        await createProduct({ ...input, price: 3.79, regularPrice: 5.59, picture: "", hidden: true });

        expect(prisma.brand.create).not.toHaveBeenCalled();
        const [args] = jest.mocked(prisma.product.create).mock.calls[0];
        expect(args.data).toMatchObject({ brandId: "brand-nutella", price: 3790, regularPrice: 5590, picture: "", hidden: true });
    });

    it.each<[string, Partial<NewProductInput>, string]>([
        ["an invalid barcode", { barCode: "301762042200310" }, "Code-barres invalide : 1 à 14 chiffres."],
        ["a photo hosted elsewhere", { picture: "https://example.com/nutella.jpg" }, "La photo doit provenir d'Open Food Facts."],
        ["a negative stock", { stock: -1 }, "Le stock ne peut pas être négatif."],
        ["a crossed-out price below the price", { regularPrice: 4 }, "Le prix barré doit être supérieur au prix de vente."],
    ])("rejects %s", async (_, change, error) => {
        const result = await createProduct({ ...input, ...change });

        expect(result).toEqual({ ok: false, error });
        expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it("refuses a barcode already in the catalog", async () => {
        (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: "prod0" });

        const result = await createProduct(input);

        expect(result).toEqual({ ok: false, error: "Ce code-barres est déjà utilisé par un autre produit." });
        expect(prisma.brand.create).not.toHaveBeenCalled();
        expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it("refuses a barcode created meanwhile by someone else", async () => {
        (prisma.product.create as jest.Mock).mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`barCode`)", {
                code: "P2002",
                clientVersion: Prisma.prismaVersion.client,
            })
        );

        const result = await createProduct(input);

        expect(result).toEqual({ ok: false, error: "Ce code-barres est déjà utilisé par un autre produit." });
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("is reserved to administrators", async () => {
        (requireAdmin as jest.Mock).mockRejectedValue(new AccessDeniedError());

        await expect(createProduct(input)).rejects.toBeInstanceOf(AccessDeniedError);
        expect(prisma.product.create).not.toHaveBeenCalled();
    });
});
