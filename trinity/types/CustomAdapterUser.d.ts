import { Role } from "@prisma/client";
import type { AdapterUser as BaseAdapterUser } from "next-auth/adapters";

declare module "@auth/core/adapters" {
  interface AdapterUser {
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  }
}

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  }

  interface Session {
    user: User & DefaultSession["user"];
    expires: string;
    error: string;
  }
}
