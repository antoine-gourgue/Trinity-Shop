"use client";

import { useState, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogTrigger,
} from "@/components/ui/responsiveDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUser, deleteUser } from "@/lib/server-actions/users-actions";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: string;
};

export const columns: ColumnDef<User>[] = [
    {
        accessorKey: "id",
        header: "ID",
    },
    {
        accessorKey: "firstName",
        header: "Prénom",
    },
    {
        accessorKey: "lastName",
        header: "Nom",
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "phone",
        header: "Téléphone",
    },
    {
        accessorKey: "role",
        header: "Rôle",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const user = row.original;
            const router = useRouter();
            const [menuOpen, setMenuOpen] = useState(false);
            const [dialogOpen, setResponsiveDialogOpen] = useState(false);
            const [isPending, startTransition] = useTransition();

            const [firstName, setFirstName] = useState(user.firstName);
            const [lastName, setLastName] = useState(user.lastName);
            const [email, setEmail] = useState(user.email);
            const [phone, setPhone] = useState(user.phone ?? "");
            const [role, setRole] = useState(user.role);

            const handleUpdate = () => {
                startTransition(async () => {
                    try {
                        await updateUser(
                            user.id,
                            firstName,
                            lastName,
                            email,
                            phone,
                            role
                        );
                        setResponsiveDialogOpen(false);
                        toast({
                            title: "Utilisateur mis à jour",
                            description: "Les informations de l'utilisateur ont été mises à jour avec succès.",
                        });
                        router.refresh();
                    } catch (error) {
                        console.error("Erreur lors de la mise à jour de l'utilisateur :", error);
                        toast({
                            title: "Erreur",
                            description: "Une erreur s'est produite lors de la mise à jour de l'utilisateur.",
                            variant: "destructive",
                        });
                    }
                });
            };

            const handleDelete = () => {
                startTransition(async () => {
                    try {
                        await deleteUser(user.id);
                        toast({
                            title: "Utilisateur supprimé",
                            description: "L'utilisateur a été supprimé avec succès.",
                        });
                        router.refresh();
                    } catch (error) {
                        console.error("Erreur lors de la suppression de l'utilisateur :", error);
                        toast({
                            title: "Erreur",
                            description: "Une erreur s'est produite lors de la suppression de l'utilisateur.",
                            variant: "destructive",
                        });
                    }
                });
            };

            return (
                <ResponsiveDialog open={dialogOpen} onOpenChange={setResponsiveDialogOpen}>
                    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir le menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <ResponsiveDialogTrigger asChild>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setResponsiveDialogOpen(true);
                                    }}
                                >
                                    Mettre à jour
                                </DropdownMenuItem>
                            </ResponsiveDialogTrigger>
                            <DropdownMenuItem onClick={handleDelete} disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Suppression...
                                    </>
                                ) : (
                                    "Supprimer"
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <ResponsiveDialogContent className="sm:max-w-[425px]">
                        <ResponsiveDialogHeader>
                            <ResponsiveDialogTitle>Mettre à jour l'utilisateur</ResponsiveDialogTitle>
                            <ResponsiveDialogDescription>
                                Modifiez les informations de l'utilisateur ici. Cliquez sur "Enregistrer" lorsque vous avez terminé.
                            </ResponsiveDialogDescription>
                        </ResponsiveDialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="firstName" className="text-right">
                                    Prénom
                                </Label>
                                <Input
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="lastName" className="text-right">
                                    Nom
                                </Label>
                                <Input
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">
                                    Téléphone
                                </Label>
                                <Input
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">
                                    Rôle
                                </Label>
                                <Input
                                    id="role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <ResponsiveDialogFooter>
                            <Button type="button" onClick={handleUpdate} disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        En cours...
                                    </>
                                ) : (
                                    "Enregistrer"
                                )}
                            </Button>
                        </ResponsiveDialogFooter>
                    </ResponsiveDialogContent>
                </ResponsiveDialog>
            );
        },
    },
];
