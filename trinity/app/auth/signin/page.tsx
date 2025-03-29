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
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { onSignInCredential } from "../../../services/auth/submit";
import { signinUserSchema } from "@/schemas/signinUserSchema";

export default function SignIn() {
  const form = useForm<z.infer<typeof signinUserSchema>>({
    resolver: zodResolver(signinUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
      <div className="p-4 flex justify-center items-center min-h-screen w-full">
        <div className="w-full max-w-sm flex flex-col gap-10">
          <div className="text-center">
            <h1 className="font-medium text-2xl md:text-4xl">Heureux de vous retrouver</h1>
            <h2 className="text-sm md:text-lg mt-2">
              Acheter depuis n'importe quel endroit ce que vous souhaitez
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <Button variant="outline" size="lg" disabled className="flex items-center gap-2">
              <Image alt="google" src="/assets/google.png" width={24} height={24} />
              Connection avec Google
            </Button>
            <Button variant="outline" size="lg" disabled className="flex items-center gap-2">
              <Image alt="github" src="/assets/github.svg" width={24} height={24} />
              Connection avec GitHub
            </Button>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSignInCredential)} className="flex flex-col gap-4">
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
              <Button className='bg-blue-600 hover:bg-blue-800' type="submit" size="lg">
                Se connecter
              </Button>
              <p className="text-center text-sm">
                Vous n'avez pas de compte ?
                <Link className="ml-1 text-blue-600 font-bold" href="/auth">
                  Créer un compte
                </Link>
              </p>
            </form>
          </Form>
          <p className="text-xs text-slate-500 text-center mt-4">
            &copy; 2025, tous droits réservés
          </p>
        </div>
      </div>
  );
}
