"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import Link from "next/link";
import { useCredentialsSignIn } from "@/hooks/use-credentials-sign-in";
import { signinUserSchema } from "@/schemas/signinUserSchema";
import PasswordResetNotice from "@/components/auth/password-reset-notice";

export default function SignIn() {
  const form = useForm<z.infer<typeof signinUserSchema>>({
    resolver: zodResolver(signinUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const signInWithCredentials = useCredentialsSignIn();

  const handleSubmit = async (values: z.infer<typeof signinUserSchema>) => {
    setServerError(null);
    const result = await signInWithCredentials(values);
    if (result?.error) setServerError(result.error);
  };

  return (
      <div className="p-6 flex justify-center items-center w-full">
        <div className="w-full max-w-sm flex flex-col gap-10">
          <div className="text-center">
            <h1 className="font-black text-2xl md:text-4xl">Heureux de vous retrouver</h1>
            <h2 className="text-sm md:text-lg mt-2 text-muted-foreground">
              Faites vos courses en ligne et récupérez-les au drive.
            </h2>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
              {/* Suspense : le bandeau lit l'URL avec useSearchParams */}
              <Suspense fallback={null}>
                <PasswordResetNotice />
              </Suspense>
              <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@mail.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl>
                          <Input placeholder="*******" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )}
              />
              <Link className="-mt-2 self-end text-sm text-primary font-bold" href="/auth/mot-de-passe-oublie">
                Mot de passe oublié ?
              </Link>
              {serverError && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  {serverError}
                </p>
              )}
              <Button className="rounded-full font-bold" type="submit" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                Se connecter
              </Button>
              <p className="text-center text-sm">
                Vous n’avez pas de compte ?
                <Link className="ml-1 text-primary font-bold" href="/auth">
                  Créer un compte
                </Link>
              </p>
            </form>
          </Form>
          <p className="text-xs text-slate-500 text-center mt-4">
            © 2026 Trinity Shop, tous droits réservés
          </p>
        </div>
      </div>
  );
}
