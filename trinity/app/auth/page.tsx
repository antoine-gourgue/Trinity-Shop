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

    return (
        <div className="p-6 flex justify-center items-center w-full min-h-screen">
            <div className="max-w-lg w-full flex flex-col gap-10">
                <div className="text-center">
                    <h1 className="font-medium text-3xl">Créer un compte gratuitement</h1>
                    <h2 className="text-lg text-gray-600 mt-2">
                        Acheter depuis n'importe quel endroit ce que vous souhaitez
                    </h2>
                </div>
                <div className="flex flex-col gap-4 w-full">
                    <Button variant={"outline"} size={"lg"} disabled className="flex items-center justify-center gap-2">
                        <Image alt="google" src="/assets/google.png" width={24} height={24} />
                        Créer avec Google
                    </Button>
                    <Button variant={"outline"} size={"lg"} disabled className="flex items-center justify-center gap-2">
                        <Image alt="github" src="/assets/github.svg" width={24} height={24} />
                        Créer avec GitHub
                    </Button>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onCreateCredentials)} className="flex flex-col gap-6 w-full">
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
                        <Button type="submit" size={"lg"} className="bg-blue-600 hover:bg-blue-800 w-full">
                            Créer un compte
                        </Button>
                        <p className="text-center font-medium">
                            Vous avez déjà un compte ? {" "}
                            <Link className="text-blue-600 font-bold" href={"/auth/signin"}>
                                Se connecter
                            </Link>
                        </p>
                    </form>
                </Form>
                <p className="text-sm text-gray-500 text-center">
                    Copyright 2025, tous droits réservés
                </p>
            </div>
        </div>
    );
}