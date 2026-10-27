import Link from "next/link";
import { Heart } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/account";
import { currentStore } from "@/lib/current-store";
import { withStorePrices } from "@/lib/store-prices";
import { AccountHeader } from "@/components/account/account-ui";
import ProductGrid from "@/components/catalog/product-grid";
import AddFavoritesToCart from "@/components/account/add-favorites-to-cart";

export const dynamic = "force-dynamic";

// Produits mis de côté par le client, les plus récents d'abord
export default async function FavorisPage() {
    const sessionUser = await requireUser();
    const favorites = await prisma.favorite.findMany({
        where: { userId: sessionUser.id, product: { hidden: false } },
        orderBy: { createdAt: "desc" },
        include: { product: { include: { brand: true } } },
    });
    const store = await currentStore();
    const products = await withStorePrices(
        favorites.map((favorite) => favorite.product),
        store?.id
    );

    return (
        <div>
            <AccountHeader
                title="Mes favoris"
                description={
                    products.length
                        ? `${products.length} produit${products.length > 1 ? "s" : ""} mis de côté`
                        : "Retrouvez ici les produits que vous achetez souvent."
                }
            >
                {products.length > 0 && <AddFavoritesToCart />}
            </AccountHeader>
            {products.length ? (
                <ProductGrid products={products} className="xl:grid-cols-3" />
            ) : (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-white px-6 py-14 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-promo/10 text-promo">
                        <Heart size={26} aria-hidden />
                    </span>
                    <p className="font-bold">Aucun favori pour l’instant</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Touchez le cœur d’un produit pour le retrouver ici et l’ajouter plus vite à votre panier.
                    </p>
                    <Link href="/produits" className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-brand-dark">
                        Parcourir le catalogue
                    </Link>
                </div>
            )}
        </div>
    );
}
