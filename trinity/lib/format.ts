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

// Valeur d'un champ de prix du back-office, saisi en euros avec une virgule (« 2,39 »)
export function toPriceInput(price: number) {
  return toEuros(price).toFixed(2).replace(".", ",");
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

// Les marques U arrivent d'OpenFoodFacts sous forme de slug (« u-saveurs ») ;
// les marques nationales sont déjà écrites proprement (« Carte d'Or »)
export function formatBrand(brand?: string | null) {
  if (!brand) return "";
  const key = brand.trim().toLowerCase();
  if (BRAND_LABELS[key]) return BRAND_LABELS[key];
  if (key !== brand.trim()) return brand.trim();
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isBioBrand(brand?: string | null) {
  return !!brand && brand.toLowerCase().includes("bio");
}

// Remise en pourcentage entière, ou null si le produit n'est pas en promotion
export function discountPercent(price: number, regularPrice?: number | null) {
  if (!regularPrice || regularPrice <= price) return null;
  return Math.round((1 - price / regularPrice) * 100);
}

// Dernier jour d'une promotion, en court (« 02/11 ») : la fin enregistrée est minuit le lendemain
export function formatPromoLastDay(end: Date | string) {
  const last = new Date(new Date(end).getTime() - 1);
  return last.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" });
}
