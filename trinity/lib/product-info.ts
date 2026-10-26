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

const NUTRIENTS: { key: string; label: string }[] = [
  { key: "fat_100g", label: "Matières grasses" },
  { key: "saturated-fat_100g", label: "Dont acides gras saturés" },
  { key: "carbohydrates_100g", label: "Glucides" },
  { key: "sugars_100g", label: "Dont sucres" },
  { key: "fiber_100g", label: "Fibres alimentaires" },
  { key: "proteins_100g", label: "Protéines" },
  { key: "salt_100g", label: "Sel" },
];

function nutrientValue(nutriments: Record<string, unknown>, key: string) {
  const raw = nutriments[key];
  const value = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
  return Number.isFinite(value) ? value : null;
}

// Tableau nutritionnel pour 100 g : énergie sur une ligne (kJ | kcal), puis les nutriments
export function nutritionRows(nutriments?: Record<string, unknown> | null) {
  if (!nutriments) return [];

  const kj = nutrientValue(nutriments, "energy-kj_100g") ?? nutrientValue(nutriments, "energy_100g");
  const kcal = nutrientValue(nutriments, "energy-kcal_100g");
  const energy = [kj !== null && `${numberFormatter.format(kj)} kJ`, kcal !== null && `${numberFormatter.format(kcal)} kcal`]
    .filter(Boolean)
    .join(" | ");

  const rows = NUTRIENTS.flatMap(({ key, label }) => {
    const value = nutrientValue(nutriments, key);
    return value === null ? [] : [{ label, value: `${numberFormatter.format(value)} g` }];
  });

  return energy ? [{ label: "Valeurs énergétiques", value: energy }, ...rows] : rows;
}
