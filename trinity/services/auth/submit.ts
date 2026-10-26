"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import { createUserSchema } from "@/schemas/createUserSchema";
import { signinUserSchema } from "@/schemas/signinUserSchema";
import { authErrorMessage } from "@/services/auth/errors";
import { z } from "zod";

// signIn redirige en levant NEXT_REDIRECT : seules les erreurs d'authentification sont interceptées
async function signInWithCredentials(values: Record<string, string>) {
  try {
    await signIn("credentials", { ...values, redirectTo: "/" });
  } catch (error) {
    if (error instanceof CredentialsSignin) return { error: authErrorMessage(error.code) };
    if (error instanceof AuthError) return { error: authErrorMessage() };
    throw error;
  }
}

export async function onCreateCredentials(values: z.infer<typeof createUserSchema>) {
  return signInWithCredentials(values);
}

export async function onSignInCredential(values: z.infer<typeof signinUserSchema>) {
  return signInWithCredentials(values);
}
