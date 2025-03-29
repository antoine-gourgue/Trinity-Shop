"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {useEffect, useState, useTransition} from "react"
import {deleteProduct, updateProduct, getCategories, getProductCategories} from "@/lib/server-actions/products-actions"
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogTrigger,
} from "@/components/ui/responsiveDialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { nutriScore } from "@prisma/client"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export type Product = {
    productId: string
    name: string
    description: string
    price: number
    barcode: bigint
    nutriscore: nutriScore | null
    brand: string
    category: string
    picture: string
}

export const columns: ColumnDef<Product>[] = [
    {
        accessorKey: "productId",
        header: "ID",
    },
    {
        accessorKey: "picture",
        header: "Image",
        cell: ({ row }) => (
            <img
                src={row.original.picture}
                alt={row.original.name}
                className="h-10 w-10 object-cover rounded-md"
            />
        ),
    },
    {
        accessorKey: "name",
        header: "Produit",
        cell: ({ row }) => (
            <Link
                href={`/admin/products/${row.original.barcode.toString()}`}
                className="text-blue-500 hover:underline"
            >
                {row.original.name}
            </Link>
        ),
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
            const text = row.original.description
            return text.length > 50 ? `${text.slice(0, 50)}...` : text
        },
    },
    {
        accessorKey: "price",
        header: "Prix",
    },
    {
        accessorKey: "barcode",
        header: "Code barre",
        cell: ({ row }) => row.original.barcode.toString(),
    },
    {
        accessorKey: "nutriscore",
        header: "Nutriscore",
    },
    {
        accessorKey: "brand",
        header: "Marque",
    },
    {
        accessorKey: "category",
        header: "Catégorie",
        cell: ({ row }) => {
            const text = row.original.category
            return text.length > 30 ? `${text.slice(0, 30)}...` : text
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const product = row.original
            const router = useRouter()
            const [menuOpen, setMenuOpen] = useState(false)
            const [dialogOpen, setResponsiveDialogOpen] = useState(false)
            const [name, setName] = useState(product.name.toString())
            const [price, setPrice] = useState(product.price.toString())
            const [barcode, setBarcode] = useState(product.barcode.toString())
            const [description, setDescription] = useState(product.description.toString())
            const [nutriscore, setNutriscore] = useState(product.nutriscore?.toString() || "")
            const [brand, setBrand] = useState(product.brand.toString())
            const [category, setCategory] = useState(product.category.toString())
            const [isPending, startTransition] = useTransition()

            const handleUpdate = () => {
                startTransition(async () => {
                    try {
                        const convertedNutriScore = nutriscore
                            ? (Object.values(nutriScore) as string[]).includes(nutriscore.toUpperCase())
                                ? (nutriscore.toUpperCase() as nutriScore)
                                : null
                            : null

                        await updateProduct(
                            product.productId,
                            name,
                            Number(price),
                            BigInt(barcode),
                            description,
                            convertedNutriScore,
                            brand,
                            selectedCategories
                        )
                        setResponsiveDialogOpen(false)
                        toast({
                            title: "Produit mis à jour",
                            description: "Le produit a été mis à jour avec succès.",
                        })
                        router.refresh()
                    } catch (error) {
                        console.error("Erreur lors de la mise à jour :", error)
                        toast({
                            title: "Erreur",
                            description: "Erreur lors de la mise à jour du produit.",
                            variant: "destructive",
                        })
                    }
                })
            }

            const handleDelete = () => {
                startTransition(async () => {
                    try {
                        await deleteProduct(product.productId)
                        setResponsiveDialogOpen(false)
                        toast({
                            title: "Produit supprimé",
                            description: "Le produit a été supprimé avec succès.",
                            variant: "default",
                        })
                        router.refresh()
                    } catch (error) {
                        console.error("Erreur lors de la suppression :", error)
                        toast({
                            title: "Erreur",
                            description: "Erreur lors de la suppression du produit.",
                            variant: "destructive",
                        })
                    }
                })
            }

            const [categories, setCategories] = useState<string[]>([]);
            const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

            useEffect(() => {
                async function fetchCategories() {
                    try {
                        const allCategories = await getCategories();
                        setCategories(allCategories.map((c) => c.name));

                        const productCategories = await getProductCategories(product.productId);
                        setSelectedCategories(productCategories.map((c) => c.categoryName));
                    } catch (error) {
                        console.error("Erreur lors de la récupération des catégories :", error);
                    }
                }
                fetchCategories();
            }, []);

            const [searchTerm, setSearchTerm] = useState("");
            const [filteredCategories, setFilteredCategories] = useState<string[]>(categories);

            useEffect(() => {
                setFilteredCategories(
                    categories.filter((cat) => cat.toLowerCase().includes(searchTerm))
                );
            }, [searchTerm, categories]);

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
                            <DropdownMenuItem onClick={handleDelete}>
                                Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <ResponsiveDialogContent className="sm:max-w-[500px] h-[90vh] flex flex-col">
                        <ResponsiveDialogHeader>
                            <ResponsiveDialogTitle>Mettre à jour le produit</ResponsiveDialogTitle>
                            <ResponsiveDialogDescription>
                                Modifiez les détails du produit ici. Cliquez sur "Enregistrer" lorsque vous avez terminé.
                            </ResponsiveDialogDescription>
                        </ResponsiveDialogHeader>

                        <div className="grid gap-4 py-4 overflow-y-auto flex-grow">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nom</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} type="text" className="col-span-3" />

                                <Label htmlFor="price" className="text-right">Prix</Label>
                                <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="col-span-3" />

                                <Label htmlFor="barcode" className="text-right">Code barre</Label>
                                <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} type="number" className="col-span-3" />

                                <Label htmlFor="description" className="text-right">Description</Label>
                                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} type="text" className="col-span-3" />

                                <Label htmlFor="nutriscore" className="text-right">Nutriscore</Label>
                                <Input id="nutriscore" value={nutriscore} onChange={(e) => setNutriscore(e.target.value)} type="text" className="col-span-3" />

                                <Label htmlFor="brand" className="text-right">Marque</Label>
                                <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} type="text" className="col-span-3" />
                            </div>

                            <div className="mb-4">
                                <Label className="text-right">Catégories sélectionnées :</Label>
                                <div className="max-h-28 overflow-y-auto flex flex-wrap gap-2 mt-2 border p-2 rounded">
                                    {selectedCategories.length === 0 ? (
                                        <span className="text-gray-500">Aucune catégorie sélectionnée</span>
                                    ) : (
                                        selectedCategories.map((cat) => (
                                            <span key={cat} className="bg-black text-white px-3 py-1 text-sm rounded flex items-center">
                                {cat}
                                                <button
                                                    type="button"
                                                    className="ml-2 text-white hover:text-gray-200"
                                                    onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== cat))}
                                                >
                                    ✖
                                </button>
                            </span>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="border p-4 rounded-md shadow-md">
                                <Label className="block text-sm font-medium text-gray-700">Sélectionner des catégories :</Label>

                                <input
                                    type="text"
                                    placeholder="Rechercher une catégorie..."
                                    className="w-full p-2 border rounded mb-2 text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                                />

                                <div className="max-h-48 overflow-y-auto border rounded p-2">
                                    {filteredCategories.length === 0 ? (
                                        <p className="text-gray-500 text-sm">Aucune catégorie trouvée</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {filteredCategories.map((cat) => (
                                                <label key={cat} className="flex items-center space-x-2 cursor-pointer text-sm">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 text-black border-gray-300 rounded bg-black"
                                                        checked={selectedCategories.includes(cat)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedCategories([...selectedCategories, cat]);
                                                            } else {
                                                                setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                                            }
                                                        }}
                                                    />
                                                    <span>{cat}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <ResponsiveDialogFooter className="mt-auto bg-white py-2">
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
