import { formatPrice } from "./format";

// Contenance OpenFoodFacts (« 120 g », « 4 x 125 g », « 1,5 L ») convertie en kg ou en litres
export function parseQuantity(quantity?: string | null) {
  if (!quantity) return null;
  const match = quantity
    .toLowerCase()
    .replace(",", ".")
    .match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(kg|mg|g|cl|ml|l)\b/);
  if (!match) return null;

  const count = match[1] ? Number.parseInt(match[1], 10) : 1;
  const value = Number.parseFloat(match[2]) * count;
  const factors: Record<string, [number, "kg" | "L"]> = {
    kg: [1, "kg"],
    g: [1 / 1000, "kg"],
    mg: [1 / 1_000_000, "kg"],
    l: [1, "L"],
    cl: [1 / 100, "L"],
    ml: [1 / 1000, "L"],
  };
  const [factor, unit] = factors[match[3]];
  const amount = value * factor;
  return amount > 0 ? { amount, unit } : null;
}

export function formatUnitPrice(price: number, quantity?: string | null) {
  const parsed = parseQuantity(quantity);
  if (!parsed) return null;
  return `${formatPrice(price / parsed.amount)} / ${parsed.unit}`;
}

const ALLERGENS: Record<string, string> = {
  "en:gluten": "Gluten",
  "en:milk": "Lait",
  "en:eggs": "Œufs",
  "en:nuts": "Fruits à coque",
  "en:peanuts": "Arachides",
  "en:soybeans": "Soja",
  "en:fish": "Poisson",
  "en:crustaceans": "Crustacés",
  "en:molluscs": "Mollusques",
  "en:celery": "Céleri",
  "en:mustard": "Moutarde",
  "en:sesame-seeds": "Sésame",
  "en:sulphur-dioxide-and-sulphites": "Sulfites",
  "en:lupin": "Lupin",
};

export function formatAllergens(tags?: string[] | null) {
  return (tags ?? []).map((tag) => ALLERGENS[tag]).filter(Boolean);
}

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

const NUTRIENTS: { key: string; label: string; unit: string; indent?: boolean }[] = [
  { key: "energy-kj_100g", label: "Énergie", unit: "kJ" },
  { key: "energy-kcal_100g", label: "Énergie", unit: "kcal" },
  { key: "fat_100g", label: "Matières grasses", unit: "g" },
  { key: "saturated-fat_100g", label: "dont acides gras saturés", unit: "g", indent: true },
  { key: "carbohydrates_100g", label: "Glucides", unit: "g" },
  { key: "sugars_100g", label: "dont sucres", unit: "g", indent: true },
  { key: "fiber_100g", label: "Fibres alimentaires", unit: "g" },
  { key: "proteins_100g", label: "Protéines", unit: "g" },
  { key: "salt_100g", label: "Sel", unit: "g" },
];

export function nutritionRows(nutriments?: Record<string, unknown> | null) {
  if (!nutriments) return [];
  return NUTRIENTS.flatMap(({ key, label, unit, indent }) => {
    const raw = nutriments[key] ?? (key === "energy-kj_100g" ? nutriments["energy_100g"] : undefined);
    const value = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
    return Number.isFinite(value)
      ? [{ label, value: `${numberFormatter.format(value)} ${unit}`, indent: !!indent }]
      : [];
  });
}
