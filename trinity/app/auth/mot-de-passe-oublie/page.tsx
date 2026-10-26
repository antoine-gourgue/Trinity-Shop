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
import { useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/schemas/passwordResetSchema";
import { requestPasswordResetAction } from "@/lib/server-actions/password-reset-actions";

export default function ForgotPassword() {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (values: ForgotPasswordInput) => {
    setServerError(null);
    const result = await requestPasswordResetAction(values);
    if (result.ok) setSent(true);
    else setServerError(result.error);
  };

  return (
      <div className="p-6 flex justify-center items-center w-full">
        <div className="w-full max-w-sm flex flex-col gap-10">
          <div className="text-center">
            <h1 className="font-black text-2xl md:text-4xl">Mot de passe oublié ?</h1>
            <h2 className="text-sm md:text-lg mt-2 text-muted-foreground">
              Indiquez l’adresse e-mail de votre compte, nous vous enverrons un lien pour choisir un nouveau mot de passe.
            </h2>
          </div>
          {sent ? (
            <div className="flex flex-col gap-4">
              {/* Même message qu'un compte existe ou non : on ne révèle pas les adresses inscrites */}
              <p role="status" className="rounded-xl bg-bio/10 px-4 py-3 text-sm font-semibold text-bio">
                Si un compte existe pour cette adresse, vous allez recevoir un e-mail avec un lien pour
                réinitialiser votre mot de passe. Ce lien est valable 1 heure.
              </p>
              <Button asChild className="rounded-full font-bold" size="lg">
                <Link href="/auth/signin">Retour à la connexion</Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@mail.com" autoComplete="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                />
                {serverError && (
                  <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                    {serverError}
                  </p>
                )}
                <Button className="rounded-full font-bold" type="submit" size="lg" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                  Recevoir le lien
                </Button>
                <p className="text-center text-sm">
                  Vous vous souvenez de votre mot de passe ?
                  <Link className="ml-1 text-primary font-bold" href="/auth/signin">
                    Se connecter
                  </Link>
                </p>
              </form>
            </Form>
          )}
          <p className="text-xs text-slate-500 text-center mt-4">
            © 2026 Trinity Shop, tous droits réservés
          </p>
        </div>
      </div>
  );
}
