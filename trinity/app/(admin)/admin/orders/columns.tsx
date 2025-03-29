"use client";

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
import { useState, useTransition } from "react";
import { deleteOrder, generateInvoice } from "@/lib/server-actions/orders-actions";
import { ResponsiveDialog } from "@/components/ui/responsiveDialog";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export interface Order {
    id: string;
    cartId: string;
    userId: string;
    billingAddress: string | null;
    validated: boolean;
    createdAt: string;
    updatedAt: string;
    email: string;
}

export const columns: ColumnDef<Order>[] = [
    {
        accessorKey: "id",
        header: "Numéro de commande",
    },
    {
        accessorKey: "email",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                >
                    Email
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "createdAt",
        header: "Commandé le",
        cell: ({ row }) => {
            const date = new Date(row.original.createdAt).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
            });
            return <span>{date}</span>;
        },
        sortingFn: "datetime",
    },
    {
        accessorKey: "cartId",
        header: "Numéro de panier",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const order = row.original;
            const [menuOpen, setMenuOpen] = useState(false);
            const [dialogOpen, setDialogOpen] = useState(false);
            const [isPending, startTransition] = useTransition();
            const [isGenerating, setIsGenerating] = useState(false);
            const router = useRouter();
            const handleGenerateInvoice = async () => {
                setIsGenerating(true);
                try {
                    const base64PDF = await generateInvoice(order.id);
                    const binaryString = atob(base64PDF);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: "application/pdf" });
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                } catch (error) {
                    console.error("Erreur lors de la génération de la facture :", error);
                    toast({
                        title: "Erreur",
                        description: "Erreur lors de la génération de la facture.",
                        variant: "destructive",
                    });
                } finally {
                    setIsGenerating(false);
                }
            };

            const handleDelete = () => {
                startTransition(async () => {
                    try {
                        await deleteOrder(order.id);
                        toast({
                            title: "Commande supprimée",
                            description: "La commande a été supprimée avec succès.",
                        });
                        router.refresh()
                    } catch (e) {
                        console.error("Erreur lors de la suppression de la commande :", e);
                        toast({
                            title: "Erreur",
                            description: "Erreur lors de la suppression de la commande.",
                            variant: "destructive",
                        });
                    }
                });
            };

            return (
                <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                            <DropdownMenuItem onClick={handleGenerateInvoice} disabled={isGenerating}>
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Génération...
                                    </>
                                ) : (
                                    "Télécharger la facture"
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} disabled={isPending}>
                                {isPending ? "Suppression..." : "Supprimer"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ResponsiveDialog>
            );
        },
    },
];
