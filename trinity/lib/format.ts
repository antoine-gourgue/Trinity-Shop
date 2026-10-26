// Les prix sont stockés en millièmes d'euro (ex : 7570 = 7,57 €)
const PRICE_UNIT = 1000;

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function toEuros(price: number) {
  return price / PRICE_UNIT;
}

export function formatPrice(price: number) {
  return euroFormatter.format(toEuros(price));
}

const BRAND_LABELS: Record<string, string> = {
  u: "U",
  "u-saveurs": "U Saveurs",
  "u-bio": "U Bio",
  "u-mat-lou": "U Mat&Lou",
  "mat-lou": "Mat&Lou",
  "bien-vu": "Bien Vu",
  "u-bon-vegetarien": "U Bon & Végétarien",
  "u-oxygn": "U Oxygn",
  "u-sans-gluten": "U Sans Gluten",
  "hyper-u": "Hyper U",
};

// Les marques arrivent d'OpenFoodFacts sous forme de slug (« u-saveurs »)
export function formatBrand(brand?: string | null) {
  if (!brand) return "";
  const key = brand.trim().toLowerCase();
  if (BRAND_LABELS[key]) return BRAND_LABELS[key];
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isBioBrand(brand?: string | null) {
  return !!brand && brand.toLowerCase().includes("bio");
}
