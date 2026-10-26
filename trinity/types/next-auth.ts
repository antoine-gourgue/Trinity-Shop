import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

// Fichier .ts (et non .d.ts) : skipLibCheck ne s'y applique pas, ces déclarations sont donc vérifiées

// Champs que Trinity ajoute au jeton et à la session NextAuth
interface TrinityIdentity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  cartId: string | null;
  billingAddress: string | null;
}

declare module "next-auth" {
  // Utilisateur renvoyé par authorize() à la connexion ou à l'inscription
  interface User {
    firstName: string;
    lastName: string;
    role: Role;
  }

  interface Session {
    user: TrinityIdentity & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  // Renseignés à la connexion (l'e-mail est déjà déclaré par NextAuth)
  interface JWT {
    id?: string;
    firstName?: string;
    lastName?: string;
    role?: Role;
    cartId?: string | null;
    billingAddress?: string | null;
  }
}
