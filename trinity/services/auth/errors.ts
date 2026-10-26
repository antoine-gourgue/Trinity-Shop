import { CredentialsSignin } from "next-auth";

// Erreurs d'authentification remontées au formulaire via leur code
export class EmailAlreadyUsed extends CredentialsSignin {
  code = "email_taken";
}

export class InvalidSignupData extends CredentialsSignin {
  code = "invalid_signup";
}
