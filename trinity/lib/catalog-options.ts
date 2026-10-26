// Options de tri / filtres des listes produits, partagées entre serveur et client

export const PAGE_SIZE = 24;

export const SORT_OPTIONS = [
  { value: "nom", label: "Nom (A → Z)" },
  { value: "prix-croissant", label: "Prix croissant" },
  { value: "prix-decroissant", label: "Prix décroissant" },
  { value: "nutriscore", label: "Meilleur Nutri-Score" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
export const DEFAULT_SORT: SortValue = "nom";

// Bornes en millièmes d'euro, comme les prix en base
export const PRICE_RANGES = [
  { value: "moins-de-2", label: "Moins de 2 €", min: 0, max: 2000 },
  { value: "2-5", label: "De 2 à 5 €", min: 2000, max: 5000 },
  { value: "5-8", label: "De 5 à 8 €", min: 5000, max: 8000 },
  { value: "plus-de-8", label: "Plus de 8 €", min: 8000, max: undefined },
] as const;

export const NUTRI_GRADES = ["A", "B", "C", "D", "E"] as const;
export type NutriGrade = (typeof NUTRI_GRADES)[number];

export interface ListingParams {
  q?: string;
  cat?: string;
  categorie?: string;
  marques: string[];
  nutriscores: NutriGrade[];
  prix?: string;
  tri: SortValue;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function asList(value: string | string[] | undefined) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function asString(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

export function parseListingParams(raw: RawParams): ListingParams {
  const tri = asString(raw.tri);
  const page = Number.parseInt(asString(raw.page) ?? "1", 10);
  const prix = asString(raw.prix);

  return {
    q: asString(raw.q),
    cat: asString(raw.cat),
    categorie: asString(raw.categorie),
    marques: asList(raw.marque),
    nutriscores: asList(raw.nutriscore)
      .map((grade) => grade.toUpperCase())
      .filter((grade): grade is NutriGrade => NUTRI_GRADES.includes(grade as NutriGrade)),
    prix: PRICE_RANGES.some((range) => range.value === prix) ? prix : undefined,
    tri: SORT_OPTIONS.some((option) => option.value === tri) ? (tri as SortValue) : DEFAULT_SORT,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// Construit l'URL d'une liste en appliquant des modifications ; tout changement
// de filtre revient à la page 1 sauf si une page est explicitement demandée
export function listingHref(
  basePath: string,
  params: ListingParams,
  changes: Partial<ListingParams> = {}
) {
  const next = { ...params, page: 1, ...changes };
  const query = new URLSearchParams();

  if (next.q) query.set("q", next.q);
  if (next.cat) query.set("cat", next.cat);
  if (next.categorie) query.set("categorie", next.categorie);
  next.marques.forEach((marque) => query.append("marque", marque));
  next.nutriscores.forEach((grade) => query.append("nutriscore", grade));
  if (next.prix) query.set("prix", next.prix);
  if (next.tri !== DEFAULT_SORT) query.set("tri", next.tri);
  if (next.page > 1) query.set("page", String(next.page));

  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function toggleValue<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function activeFilterCount(params: ListingParams) {
  return params.marques.length + params.nutriscores.length + (params.prix ? 1 : 0);
}
