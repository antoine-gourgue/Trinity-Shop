import { z } from "zod";

export const signinUserSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères.")
    .max(100, "Le mot de passe est trop long."),
});
