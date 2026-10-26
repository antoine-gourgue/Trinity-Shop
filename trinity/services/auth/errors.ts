import { CredentialsSignin } from "next-auth";

// Erreurs d'authentification remontées au formulaire via leur code
export class EmailAlreadyUsed extends CredentialsSignin {
  code = "email_taken";
}

export class InvalidSignupData extends CredentialsSignin {
  code = "invalid_signup";
}

const MESSAGES: Record<string, string> = {
  credentials: "E-mail ou mot de passe incorrect.",
  email_taken: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou utilisez une autre adresse.",
  invalid_signup: "Certaines informations sont invalides, vérifiez le formulaire.",
};

export function authErrorMessage(code?: string) {
  return (code && MESSAGES[code]) || "Une erreur est survenue. Réessayez dans un instant.";
}
