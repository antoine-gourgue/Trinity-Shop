// Remplace next-auth dans Jest (module ES) : seules les classes d'erreur sont utilisées hors de auth.ts
export class AuthError extends Error {
  type = "AuthError";
}

export class CredentialsSignin extends AuthError {
  code = "credentials";
}

export default function NextAuth() {
  return { handlers: {}, auth: async () => null, signIn: async () => undefined, signOut: async () => undefined };
}
