import { formatBrand, formatPrice, toEuros } from "@/lib/format";
import { absoluteUrl } from "@/lib/site-url";

// Champs d'un produit utilisés pour le référencement (un produit Prisma avec sa marque et son stock convient)
export interface SeoProduct {
  id: string;
  name: string;
  price: number; // en millièmes d'euro
  picture: string;
  barCode: bigint | string;
  netContent?: string | null;
  nutriScore?: string | null;
  brand?: { name: string } | null;
  stock?: { quantity: number } | null;
}

type GtinProperty = "gtin8" | "gtin12" | "gtin13" | "gtin14";

const GTIN_PROPERTIES: Record<number, GtinProperty> = {
  8: "gtin8",
  12: "gtin12",
  13: "gtin13",
  14: "gtin14",
};

type Availability = "https://schema.org/InStock" | "https://schema.org/OutOfStock";

// Données structurées schema.org/Product (https://schema.org/Product), limitées aux propriétés renseignées par le site
export interface ProductJsonLd extends Partial<Record<GtinProperty, string>> {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  url: string;
  sku: string;
  description?: string;
  image?: string[];
  brand?: { "@type": "Brand"; name: string };
  offers: {
    "@type": "Offer";
    url: string;
    price: string;
    priceCurrency: "EUR";
    availability: Availability;
    itemCondition: "https://schema.org/NewCondition";
    seller: { "@type": "Organization"; name: string };
  };
}

export function productPath(id: string) {
  return `/product/${id}`;
}

// Le code-barres est stocké en entier : un EAN-13 commençant par 0 perd ce zéro et se lit alors comme un GTIN-12, ce qui est équivalent
function gtin(barCode: bigint | string): Partial<Record<GtinProperty, string>> {
  const code = barCode.toString();
  const property = /^\d+$/.test(code) ? GTIN_PROPERTIES[code.length] : undefined;
  return property ? { [property]: code } : {};
}

// Description courte (balise meta, Open Graph) construite à partir des données du catalogue
export function productDescription(product: SeoProduct): string {
  const brand = formatBrand(product.brand?.name);
  const quantity = product.netContent?.trim();
  const details = [
    `${product.name}${quantity ? ` (${quantity})` : ""}`,
    brand && `marque ${brand}`,
    `à ${formatPrice(product.price)}`,
  ].filter(Boolean);
  const nutriScore = product.nutriScore ? ` Nutri-Score ${product.nutriScore}.` : "";
  return `${details.join(", ")}.${nutriScore} Commandez sur Trinity Shop, en retrait au drive ou en livraison à domicile.`;
}

export function productJsonLd(product: SeoProduct, options: { description?: string } = {}): ProductJsonLd {
  const url = absoluteUrl(productPath(product.id));
  const brand = formatBrand(product.brand?.name);
  const inStock = (product.stock?.quantity ?? 0) > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    sku: product.id,
    ...(options.description ? { description: options.description } : {}),
    ...(product.picture ? { image: [absoluteUrl(product.picture)] } : {}),
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    ...gtin(product.barCode),
    offers: {
      "@type": "Offer",
      url,
      // Même arrondi au centime que le prix affiché (5900 millièmes → "5.90")
      price: toEuros(product.price).toFixed(2),
      priceCurrency: "EUR",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Trinity Shop" },
    },
  };
}

// Contenu d'une balise <script type="application/ld+json"> : « < » est échappé pour qu'aucune valeur
// (nom de produit, description…) ne puisse fermer la balise et injecter du HTML
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
