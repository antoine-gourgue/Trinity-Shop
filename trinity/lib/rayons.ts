// Rayons du magasin : chaque rayon regroupe des catégories OpenFoodFacts.
// Les sous-rayons sont affichés en pastilles ; les catégories « extra » élargissent
// le rayon sans apparaître dans la navigation.

export interface SubCategory {
  slug: string;
  label: string;
  category: string;
  icon: string;
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

// L'icône est un nom d'icône du catalogue (voir components/catalog/subcategory-icon)
function sub(label: string, icon: string, category: string = label): SubCategory {
  return { slug: slugify(label), label, category, icon };
}

export const RAYONS: Rayon[] = [
  {
    slug: "fruits-legumes",
    name: "Fruits et Légumes",
    shortName: "Fruits & Légumes",
    description: "Légumes, fruits, salades et compotes pour cuisiner de saison.",
    image: "/categories/fruits_legumes.png",
    subcategories: [
      sub("Légumes", "Carrot", "Légumes et dérivés"),
      sub("Fruits", "Apple", "Fruits et produits dérivés"),
      sub("Salades", "LeafyGreen", "Salades vertes"),
      sub("Compotes", "Cherry"),
      sub("Fruits à coque", "Nut", "Fruits à coques"),
      sub("Légumineuses", "Bean"),
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
      sub("Volailles", "Drumstick"),
      sub("Porc", "Ham"),
      sub("Bœuf", "Beef"),
      sub("Poissons", "Fish"),
      sub("Produits de la mer", "Shell"),
      sub("Poissons fumés", "Fish"),
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
      sub("Jambons", "Ham"),
      sub("Saucissons", "Beef"),
      sub("Terrines", "UtensilsCrossed"),
      sub("Plats cuisinés", "CookingPot", "Plats préparés à réchauffer au micro-ondes"),
      sub("Salades composées", "Salad"),
      sub("Sandwichs", "Sandwich"),
      sub("Pizzas et quiches", "Pizza", "Pizzas tartes salées et quiches"),
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
      sub("Fromages", "Cheese"),
      sub("Yaourts", "Cylinder"),
      sub("Desserts lactés", "Dessert"),
      sub("Laits", "Milk"),
      sub("Beurres", "Cuboid"),
      sub("Crèmes", "Milk"),
      sub("Fromages blancs", "Cylinder"),
      sub("Œufs", "Egg"),
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
      sub("Plats cuisinés", "CookingPot", "Plats préparés surgelés"),
      sub("Glaces et sorbets", "IceCreamCone"),
      sub("Desserts glacés", "Popsicle"),
      sub("Légumes surgelés", "Carrot"),
      sub("Viandes surgelées", "Beef"),
      sub("Poissons surgelés", "Fish"),
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
      sub("Pâtes", "Wheat", "Pâtes alimentaires"),
      sub("Riz", "Wheat"),
      sub("Conserves", "Cylinder"),
      sub("Sauces", "Droplets"),
      sub("Soupes", "Soup"),
      sub("Apéritif", "Martini"),
      sub("Chips", "Popcorn", "Chips et frites"),
      sub("Plats en conserve", "CookingPot", "Plats préparés en conserve"),
      sub("Condiments", "Droplet"),
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
      sub("Biscuits", "Cookie"),
      sub("Chocolats", "Candy"),
      sub("Confiseries", "Lollipop"),
      sub("Céréales", "Wheat", "Céréales pour petit-déjeuner"),
      sub("Confitures", "Cherry"),
      sub("Pâtes à tartiner", "Cylinder", "Produits à tartiner sucrés"),
      sub("Barres", "Cuboid"),
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
      sub("Jus de fruits", "Citrus"),
      sub("Eaux", "GlassWater"),
      sub("Sodas", "CupSoda", "Boissons gazeuses"),
      sub("Thés glacés", "CupSoda"),
      sub("Boissons chaudes", "Coffee"),
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
      sub("Pains", "Wheat"),
      sub("Viennoiseries", "Croissant"),
      sub("Brioches", "Croissant"),
      sub("Pâtisseries", "Dessert"),
      sub("Gâteaux", "Cake"),
      sub("Tartes", "CakeSlice"),
    ],
    extraCategories: ["Crêpes et galettes"],
  },
  {
    slug: "hygiene-beaute",
    name: "Hygiène et Beauté",
    shortName: "Hygiène & Beauté",
    description: "Douche, soins des dents et des cheveux, déodorants, rasage, mouchoirs et cotons.",
    image: "/categories/hygiene_beaute.svg",
    subcategories: [
      sub("Douche et bain", "ShowerHead"),
      sub("Hygiène dentaire", "Tooth"),
      sub("Cheveux", "Waves"),
      sub("Déodorants", "SprayCan"),
      sub("Rasage", "Razor"),
      sub("Mouchoirs et cotons", "Cloud"),
    ],
    extraCategories: [],
  },
  {
    slug: "entretien-maison",
    name: "Entretien et Maison",
    shortName: "Entretien & Maison",
    description: "Lessives, adoucissants, vaisselle, nettoyants ménagers, papier toilette et essuie-tout.",
    image: "/categories/entretien_maison.svg",
    subcategories: [
      sub("Lessives", "WashingMachine"),
      sub("Adoucissants", "Feather"),
      sub("Vaisselle", "Droplets"),
      sub("Nettoyants ménagers", "Brush"),
      sub("Papier et essuie-tout", "ScrollText"),
    ],
    extraCategories: [],
  },
];

// Rayons non alimentaires : ni Nutri-Score ni valeurs nutritionnelles, et pas de date limite à
// surveiller (jamais d'anti-gaspi)
export const NON_FOOD_RAYONS = new Set(["hygiene-beaute", "entretien-maison"]);

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

// Produit d'un rayon non alimentaire, d'après ses catégories
export function isNonFood(categoryNames: string[]) {
  const match = findRayonForCategories(categoryNames);
  return !!match && NON_FOOD_RAYONS.has(match.rayon.slug);
}

export interface RayonLink extends Rayon {
  href: string;
  links: { id: string; name: string; href: string; icon: string }[];
}

export const RAYON_LINKS: RayonLink[] = RAYONS.map((rayon) => ({
  ...rayon,
  href: rayonHref(rayon),
  links: rayon.subcategories.map((s) => ({
    id: s.slug,
    name: s.label,
    href: rayonHref(rayon, s.slug),
    icon: s.icon,
  })),
}));
