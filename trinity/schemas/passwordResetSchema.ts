import { z } from "zod";
import { createUserSchema } from "@/schemas/createUserSchema";

export const INVALID_RESET_LINK =
  "Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande.";

// Demande d'un lien : l'adresse suit la même règle qu'à l'inscription
export const forgotPasswordSchema = z.object({
  email: createUserSchema.shape.email,
});

// Paramètres du lien reçu par e-mail (?token=…&email=…) ; le jeton fait 32 octets en hexadécimal
export const resetLinkSchema = z.object({
  email: z.string().trim().email(INVALID_RESET_LINK),
  token: z.string().regex(/^[0-9a-f]{64}$/, INVALID_RESET_LINK),
});

const passwordFields = z.object({
  // Mêmes règles qu'à l'inscription
  password: createUserSchema.shape.password,
  confirmPassword: z.string(),
});

const passwordsMatch = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword;

const passwordsMismatch = {
  message: "Les deux mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
};

// Formulaire de la page de réinitialisation
export const newPasswordSchema = passwordFields.refine(passwordsMatch, passwordsMismatch);

// Données reçues par la server action : le formulaire et les paramètres du lien
export const resetPasswordSchema = passwordFields
  .merge(resetLinkSchema)
  .refine(passwordsMatch, passwordsMismatch);

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
