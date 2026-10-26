// Messages des erreurs de connexion et d'inscription, d'après le code renvoyé par NextAuth
const MESSAGES: Record<string, string> = {
  credentials: "E-mail ou mot de passe incorrect.",
  email_taken: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou utilisez une autre adresse.",
  invalid_signup: "Certaines informations sont invalides, vérifiez le formulaire.",
};

export function authErrorMessage(code?: string | null) {
  return (code && MESSAGES[code]) || "Une erreur est survenue. Réessayez dans un instant.";
}
