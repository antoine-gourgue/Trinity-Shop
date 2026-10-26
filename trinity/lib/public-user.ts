import type { Prisma } from "@prisma/client";

// Champs d'un compte que l'API peut renvoyer : jamais le mot de passe, même chiffré
export const PUBLIC_USER = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  birthDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
