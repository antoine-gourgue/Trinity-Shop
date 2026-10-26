import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { RAYONS } from "@/lib/rayons";

// Variantes accentuées, en minuscules et en majuscules, de chaque lettre
const VARIANTS: Record<string, string> = {
  a: "aàâäáãAÀÂÄÁÃ",
  c: "cçCÇ",
  e: "eéèêëEÉÈÊË",
  i: "iîïíIÎÏÍ",
  n: "nñNÑ",
  o: "oôöóOÔÖÓ",
  u: "uùûüúUÙÛÜÚ",
  y: "yÿYŸ",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase();
}

// Mots utiles de la recherche, sans accents ni marque du pluriel (« Pâtes » → « pate »)
export function searchTerms(query: string) {
  return normalize(query)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 2)
    .map((term) => (term.length > 3 && /[sx]$/.test(term) ? term.slice(0, -1) : term))
    .slice(0, 6);
}

const LETTERS = `a-zA-Z0-9${Object.values(VARIANTS).join("")}œŒæÆ`;

// Expression régulière Postgres qui retrouve le mot quelle que soit son accentuation
// (« oeuf » trouve aussi « Œufs »), en début de mot (« oeuf » ne trouve pas « bœuf »)
function termPattern(term: string) {
  let pattern = `(?:^|[^${LETTERS}])`;
  for (let i = 0; i < term.length; i++) {
    if (term[i] === "o" && term[i + 1] === "e") {
      pattern += `(?:[${VARIANTS.o}][${VARIANTS.e}]|[œŒ])`;
      i++;
    } else {
      pattern += VARIANTS[term[i]] ? `[${VARIANTS[term[i]]}]` : term[i];
    }
  }
  return pattern;
}

const SUBCATEGORIES = RAYONS.flatMap((rayon) => rayon.subcategories);

// Identifiants des produits qui contiennent tous les mots recherchés (nom, marque ou catégorie),
// du plus pertinent au moins pertinent
export async function searchProductIds(query: string) {
  const terms = searchTerms(query);
  if (!terms.length) return [];

  // Recherche d'un sous-rayon par son nom (« pates ») : ses produits passent devant
  // ceux qui ne font que partager le mot (pâtes à tartiner, pâtés…)
  const rayonCategories = SUBCATEGORIES.filter(
    (sub) => searchTerms(sub.label).join(" ") === terms.join(" ")
  ).map((sub) => sub.category);

  const inCategory = (pattern: string) =>
    Prisma.sql`EXISTS (SELECT 1 FROM "CategoriesProducts" c WHERE c."productId" = p."id" AND c."categoryName" ~* ${pattern})`;

  const matches = terms.map((term) => {
    const pattern = termPattern(term);
    return Prisma.sql`(p."name" ~* ${pattern} OR b."name" ~* ${pattern} OR ${inCategory(pattern)})`;
  });
  const scores = terms.map((term) => {
    const pattern = termPattern(term);
    return Prisma.sql`(CASE WHEN p."name" ~* ${pattern} THEN 4 ELSE 0 END
      + CASE WHEN b."name" ~* ${pattern} THEN 2 ELSE 0 END
      + CASE WHEN ${inCategory(pattern)} THEN 1 ELSE 0 END)`;
  });
  const rayonScore = rayonCategories.length
    ? Prisma.sql`CASE WHEN EXISTS (SELECT 1 FROM "CategoriesProducts" c WHERE c."productId" = p."id" AND c."categoryName" IN (${Prisma.join(rayonCategories)})) THEN 6 ELSE 0 END`
    : Prisma.sql`0`;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p."id"
    FROM "Product" p
    JOIN "Brand" b ON b."id" = p."brandId"
    WHERE ${Prisma.join(matches, " AND ")}
    ORDER BY (${Prisma.join(scores, " + ")} + ${rayonScore}) DESC, p."name" ASC`;
  return rows.map((row) => row.id);
}
