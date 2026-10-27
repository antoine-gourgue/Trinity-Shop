// Les images OpenFoodFacts sont copiées dans public/products/<code-barres>.jpg ;
// le code-barres se lit dans le chemin de l'URL d'origine (/images/products/336/895/302/2997/…)
export function localImageFor(src: string) {
  const match = src.match(/openfoodfacts\.org\/images\/products\/([\d/]+)\/[^/]+$/);
  return match ? `/products/${match[1].replace(/\//g, "")}.jpg` : null;
}
