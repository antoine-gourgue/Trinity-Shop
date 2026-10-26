// URL publique du site, sans barre oblique finale : APP_URL si elle est définie,
// sinon le domaine de production Vercel (aussi utilisé par les déploiements de preview), sinon le serveur local
export function siteUrl(): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    const url = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
    return url.replace(/\/+$/, "");
  }

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelDomain) return `https://${vercelDomain}`;

  return "http://localhost:3000";
}

// URL absolue d'un chemin du site ; une URL déjà absolue (image OpenFoodFacts…) est rendue telle quelle
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}
