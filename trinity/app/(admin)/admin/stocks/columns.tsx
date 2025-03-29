"use client"

import { useState, useTransition } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogTrigger,
} from "@/components/ui/responsiveDialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateStock, deleteStock } from "@/lib/server-actions/stocks-actions"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export type Stock = {
    id: string
    quantity: number
    productId: string
    productName: string
    productPicture: string
    updatedAt: string
}

export const columns: ColumnDef<Stock>[] = [
    {
        accessorKey: "id",
        header: "ID du Stock",
    },
    {
        accessorKey: "productId",
        header: "ID du Produit",
    },
    {
        accessorKey: "productName",
        header: "Nom du Produit",
    },
    {
        accessorKey: "productPicture",
        header: "Photo du Produit",
        cell: ({ row }) => (
            <img
                src={row.original.productPicture}
                alt={row.original.productName}
                className="h-10 w-10 object-cover rounded-md"
            />
        ),
    },
    {
        accessorKey: "quantity",
        header: "Quantité",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const stock = row.original
            const router = useRouter()
            const [menuOpen, setMenuOpen] = useState(false)
            const [dialogOpen, setResponsiveDialogOpen] = useState(false)
            const [quantity, setQuantity] = useState(stock.quantity.toString())
            const [isPending, startTransition] = useTransition()

            const handleUpdate = () => {
                startTransition(async () => {
                    try {
                        await updateStock(stock.id, parseInt(quantity, 10))
                        setResponsiveDialogOpen(false)
                        toast({
                            title: "Stock mis à jour",
                            description: "La quantité a été mise à jour avec succès.",
                        })
                        router.refresh()
                    } catch (error) {
                        console.error("Erreur lors de la mise à jour :", error)
                        toast({
                            title: "Erreur",
                            description: "Erreur lors de la mise à jour du stock.",
                            variant: "destructive",
                        })
                    }
                })
            }

            const handleDelete = () => {
                startTransition(async () => {
                    try {
                        await deleteStock(stock.id)
                        toast({
                            title: "Stock supprimé",
                            description: "Le stock a été supprimé avec succès.",
                        })
                        router.refresh()
                    } catch (error) {
                        console.error("Erreur lors de la suppression :", error)
                        toast({
                            title: "Erreur",
                            description: "Erreur lors de la suppression du stock.",
                            variant: "destructive",
                        })
                    }
                })
            }

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
                                        setMenuOpen(false)
                                        setResponsiveDialogOpen(true)
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
                            <ResponsiveDialogTitle>Mettre à jour le stock</ResponsiveDialogTitle>
                            <ResponsiveDialogDescription>
                                Modifiez la quantité du stock ici. Cliquez sur "Enregistrer" lorsque vous avez terminé.
                            </ResponsiveDialogDescription>
                        </ResponsiveDialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="quantity" className="text-right">
                                    Quantité
                                </Label>
                                <Input
                                    id="quantity"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    type="number"
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
            )
        },
    },
]
