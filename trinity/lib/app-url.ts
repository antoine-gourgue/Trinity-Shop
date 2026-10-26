// Origine publique du site (sans barre finale), pour les liens envoyés par e-mail.
// Elle vient de la configuration, jamais de l'en-tête Host de la requête : un attaquant
// pourrait le falsifier pour qu'un lien de réinitialisation pointe vers son propre site.
export function appOrigin(): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  // Domaine de production fourni par Vercel, sans protocole (ex. « trinity.example.com »)
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelDomain) return `https://${vercelDomain}`;

  return "http://localhost:3000";
}
