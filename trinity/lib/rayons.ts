// Rayons du magasin : chaque rayon regroupe des catégories OpenFoodFacts.
// Les sous-rayons sont affichés en pastilles ; les catégories « extra » élargissent
// le rayon sans apparaître dans la navigation.

export interface SubCategory {
  slug: string;
  label: string;
  category: string;
}

export interface Rayon {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  image: string;
  subcategories: SubCategory[];
  extraCategories: string[];
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sub(label: string, category: string = label): SubCategory {
  return { slug: slugify(label), label, category };
}

export const RAYONS: Rayon[] = [
  {
    slug: "fruits-legumes",
    name: "Fruits et Légumes",
    shortName: "Fruits & Légumes",
    description: "Légumes, fruits, salades et compotes pour cuisiner de saison.",
    image: "/categories/fruits_legumes.png",
    subcategories: [
      sub("Légumes", "Légumes et dérivés"),
      sub("Fruits", "Fruits et produits dérivés"),
      sub("Salades", "Salades vertes"),
      sub("Compotes"),
      sub("Fruits à coque", "Fruits à coques"),
      sub("Légumineuses"),
    ],
    extraCategories: ["Aliments à base de fruits et de légumes"],
  },
  {
    slug: "viandes-poissons",
    name: "Viandes et Poissons",
    shortName: "Viandes & Poissons",
    description: "Volailles, porc, bœuf, poissons et produits de la mer.",
    image: "/categories/viande_poissons.png",
    subcategories: [
      sub("Volailles"),
      sub("Porc"),
      sub("Bœuf"),
      sub("Poissons"),
      sub("Produits de la mer"),
      sub("Poissons fumés"),
    ],
    extraCategories: ["Viandes"],
  },
  {
    slug: "charcuterie-traiteur",
    name: "Charcuterie et Traiteur",
    shortName: "Charcuterie & Traiteur",
    description: "Jambons, terrines, plats cuisinés et salades prêtes à déguster.",
    image: "/categories/charcuterie.webp",
    subcategories: [
      sub("Jambons"),
      sub("Saucissons"),
      sub("Terrines"),
      sub("Plats cuisinés", "Plats préparés à réchauffer au micro-ondes"),
      sub("Salades composées"),
      sub("Sandwichs"),
      sub("Pizzas et quiches", "Pizzas tartes salées et quiches"),
    ],
    extraCategories: [
      "Charcuteries",
      "Plats préparés frais",
      "Plats préparés réfrigérés",
      "Plats préparés à la viande",
      "Plats préparés au poisson",
    ],
  },
  {
    slug: "cremerie",
    name: "Produits laitiers, œufs et fromages",
    shortName: "Crèmerie",
    description: "Fromages, yaourts, desserts, beurres, crèmes et œufs.",
    image: "/categories/produit_frais.png",
    subcategories: [
      sub("Fromages"),
      sub("Yaourts"),
      sub("Desserts lactés"),
      sub("Laits"),
      sub("Beurres"),
      sub("Crèmes"),
      sub("Fromages blancs"),
      sub("Œufs"),
    ],
    extraCategories: ["Produits laitiers", "Desserts végétaliens"],
  },
  {
    slug: "surgeles",
    name: "Surgelés",
    shortName: "Surgelés",
    description: "Plats cuisinés, légumes, glaces et desserts glacés.",
    image: "/categories/surgeles_etoile.png",
    subcategories: [
      sub("Plats cuisinés", "Plats préparés surgelés"),
      sub("Glaces et sorbets"),
      sub("Desserts glacés"),
      sub("Légumes surgelés"),
      sub("Viandes surgelées"),
      sub("Poissons surgelés"),
    ],
    extraCategories: ["Surgelés"],
  },
  {
    slug: "epicerie-salee",
    name: "Épicerie salée",
    shortName: "Épicerie salée",
    description: "Pâtes, riz, conserves, sauces et tout pour l'apéritif.",
    image: "/categories/epicerie_salee.png",
    subcategories: [
      sub("Pâtes", "Pâtes alimentaires"),
      sub("Riz"),
      sub("Conserves"),
      sub("Sauces"),
      sub("Soupes"),
      sub("Apéritif"),
      sub("Chips", "Chips et frites"),
      sub("Plats en conserve", "Plats préparés en conserve"),
      sub("Condiments"),
    ],
    extraCategories: [
      "Snacks salés",
      "Assaisonnements",
      "Produits déshydratés",
      "Plats préparés d'origine végétale",
      "Céréales en grains",
      "Huiles",
      "Plats à base de pâtes",
    ],
  },
  {
    slug: "epicerie-sucree",
    name: "Épicerie sucrée",
    shortName: "Épicerie sucrée",
    description: "Biscuits, chocolats, céréales, confitures et confiseries.",
    image: "/categories/epicerie_sucree.png",
    subcategories: [
      sub("Biscuits"),
      sub("Chocolats"),
      sub("Confiseries"),
      sub("Céréales", "Céréales pour petit-déjeuner"),
      sub("Confitures"),
      sub("Pâtes à tartiner", "Produits à tartiner sucrés"),
      sub("Barres"),
    ],
    extraCategories: ["Snacks sucrés", "Petit-déjeuners", "Sucres", "Aides culinaires"],
  },
  {
    slug: "boissons",
    name: "Boissons",
    shortName: "Boissons",
    description: "Jus de fruits, eaux, sodas, thés glacés et boissons chaudes.",
    image: "/categories/boissons.svg",
    subcategories: [
      sub("Jus de fruits"),
      sub("Eaux"),
      sub("Sodas", "Boissons gazeuses"),
      sub("Thés glacés"),
      sub("Boissons chaudes"),
    ],
    extraCategories: ["Boissons"],
  },
  {
    slug: "boulangerie",
    name: "Pains et Pâtisseries",
    shortName: "Boulangerie",
    description: "Pains, viennoiseries, brioches, gâteaux et tartes.",
    image: "/categories/pains_viennoiseries_patisseries.png",
    subcategories: [
      sub("Pains"),
      sub("Viennoiseries"),
      sub("Brioches"),
      sub("Pâtisseries"),
      sub("Gâteaux"),
      sub("Tartes"),
    ],
    extraCategories: ["Crêpes et galettes"],
  },
];

export function getRayon(slug: string) {
  return RAYONS.find((rayon) => rayon.slug === slug);
}

export function rayonHref(rayon: Rayon, subSlug?: string) {
  return subSlug ? `/rayon/${rayon.slug}?cat=${subSlug}` : `/rayon/${rayon.slug}`;
}

export function rayonCategoryNames(rayon: Rayon) {
  return [...rayon.subcategories.map((s) => s.category), ...rayon.extraCategories];
}

// Rayon (et sous-rayon) le plus pertinent pour un produit, d'après ses catégories
export function findRayonForCategories(categoryNames: string[]) {
  const names = new Set(categoryNames);

  for (const rayon of RAYONS) {
    const subCategory = rayon.subcategories.find((s) => names.has(s.category));
    if (subCategory) return { rayon, subCategory };
  }

  const rayon = RAYONS.find((r) => r.extraCategories.some((name) => names.has(name)));
  return rayon ? { rayon, subCategory: undefined } : null;
}

export interface RayonLink extends Rayon {
  href: string;
  links: { id: string; name: string; href: string }[];
}

export const RAYON_LINKS: RayonLink[] = RAYONS.map((rayon) => ({
  ...rayon,
  href: rayonHref(rayon),
  links: rayon.subcategories.map((s) => ({
    id: s.slug,
    name: s.label,
    href: rayonHref(rayon, s.slug),
  })),
}));
