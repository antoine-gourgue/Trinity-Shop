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
import { z } from "zod";
import Link from "next/link";
import { onCreateCredentials } from "../../services/auth/submit";
import { createUserSchema } from "@/schemas/createUserSchema";

export default function SignIn() {
    const form = useForm<z.infer<typeof createUserSchema>>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            lastName: "",
            firstName: "",
            email: "",
            password: "",
        },
    });

    const [serverError, setServerError] = useState<string | null>(null);

    const handleSubmit = async (values: z.infer<typeof createUserSchema>) => {
      setServerError(null);
      const result = await onCreateCredentials(values);
      if (result?.error) setServerError(result.error);
    };

    return (
        <div className="p-6 flex justify-center items-center w-full">
            <div className="max-w-lg w-full flex flex-col gap-10">
                <div className="text-center">
                    <h1 className="font-black text-3xl">Créer un compte gratuitement</h1>
                    <h2 className="text-lg text-muted-foreground mt-2">
                        Faites vos courses en ligne et récupérez-les au drive.
                    </h2>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6 w-full">
                        <div className="flex flex-col md:flex-row gap-4 w-full">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>Prénom</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <FormLabel>Nom</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
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
                        {serverError && (
                            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                                {serverError}
                            </p>
                        )}
                        <Button type="submit" size={"lg"} className="w-full rounded-full font-bold" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                            Créer un compte
                        </Button>
                        <p className="text-center font-medium">
                            Vous avez déjà un compte ? {" "}
                            <Link className="text-primary font-bold" href={"/auth/signin"}>
                                Se connecter
                            </Link>
                        </p>
                    </form>
                </Form>
                <p className="text-sm text-gray-500 text-center">
                    © 2026 Trinity Shop, tous droits réservés
                </p>
            </div>
        </div>
    );
}