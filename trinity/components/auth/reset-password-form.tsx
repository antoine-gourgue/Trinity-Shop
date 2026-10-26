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
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { newPasswordSchema, type NewPasswordInput } from "@/schemas/passwordResetSchema";
import { resetPasswordAction } from "@/lib/server-actions/password-reset-actions";

interface Props {
  email: string;
  token: string;
}

// Formulaire de la page /auth/reinitialiser, affiché quand le lien reçu par e-mail est valide
export default function ResetPasswordForm({ email, token }: Props) {
  const router = useRouter();
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const [serverError, setServerError] = useState<string | null>(null);
  // Reste vrai pendant la redirection : le lien est déjà consommé, inutile de renvoyer le formulaire
  const [done, setDone] = useState(false);

  const handleSubmit = async (values: NewPasswordInput) => {
    setServerError(null);
    const result = await resetPasswordAction({ ...values, email, token });
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setDone(true);
    router.replace("/auth/signin?reinitialise=1");
  };

  const busy = form.formState.isSubmitting || done;

  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          {/* Identifiant du compte, pour que le gestionnaire de mots de passe mette à jour la bonne entrée */}
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input placeholder="*******" type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}
          />
          <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmation du mot de passe</FormLabel>
                    <FormControl>
                      <Input placeholder="*******" type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}
          />
          {serverError && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              {serverError}{" "}
              <Link className="underline" href="/auth/mot-de-passe-oublie">
                Faire une nouvelle demande
              </Link>
            </p>
          )}
          <Button className="rounded-full font-bold" type="submit" size="lg" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Enregistrer le mot de passe
          </Button>
          <p className="text-center text-sm">
            Vous vous souvenez de votre mot de passe ?
            <Link className="ml-1 text-primary font-bold" href="/auth/signin">
              Se connecter
            </Link>
          </p>
        </form>
      </Form>
  );
}
