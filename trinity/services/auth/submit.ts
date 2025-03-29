"use server";

import { signIn } from "@/auth";
import { createUserSchema } from "@/schemas/createUserSchema";
import { signinUserSchema } from "@/schemas/signinUserSchema";
import { z } from "zod";

export async function onCreateCredentials(
  values: z.infer<typeof createUserSchema>
) {
  await signIn("credentials", { ...values, redirectTo: "/" });
}

export async function onSignInCredential(
  values: z.infer<typeof signinUserSchema>
) {
  await signIn("credentials", { ...values, redirectTo: "/" });
}
