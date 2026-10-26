import type { Metadata } from "next";
import { getProductFormOptions } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import NewProductForm from "@/components/admin/new-product-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nouveau produit" };

export default async function AdminNewProductPage() {
  const { categoryNames, brandNames } = await getProductFormOptions();

  return (
    <div>
      <AdminPageHeader
        back={{ href: "/admin/products", label: "Produits" }}
        title="Nouveau produit"
        description="Recherchez le code-barres : la fiche est pré-remplie depuis Open Food Facts, à vérifier avant de créer le produit."
      />
      <NewProductForm categoryNames={categoryNames} brandNames={brandNames} />
    </div>
  );
}
