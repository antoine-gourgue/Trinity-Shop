import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package } from "lucide-react";

interface ProductPageProps {
  params: Promise<{ productId: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { productId } = await params;

  if (!productId) return notFound();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      price: true,
      description: true,
      picture: true,
      brand: { select: { name: true } },
      stock: { select: { quantity: true } },
      nutriScore: true,
      categories: {
        select: { categoryName: true },
      },
    },
  });

  if (!product) return notFound();

  return (
      <div className="flex w-full">
        <Image
            src={product.picture}
            alt={product.name}
            width={400}
            height={400}
            className="h-screen w-1/3 object-contain absolute top-0 -z-10"
        />
        <div className="flex flex-col gap-10 p-20 w-full ml-[33.33333%]">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Accueil</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {product.categories.length > 0 && (
                  <>
                    <BreadcrumbItem>
                      <BreadcrumbLink href={`/category/${product.categories[0].categoryName}`}>
                        {product.categories[0].categoryName}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="font-bold text-4xl">{product.name}</h1>
          <p className="text-2xl font-semibold">{(product.price / 1000).toFixed(2)} €</p>

          <div className="grid grid-cols-2 gap-10">
            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold">Marque</p>
              <p className="text-slate-500">{product.brand?.name || "Non spécifiée"}</p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold">Stock</p>
              <div className="flex gap-2 items-center">
                <Package size={24} className="text-slate-500" />
                <p className="text-slate-500">{product.stock?.quantity ?? "Indisponible"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold">NutriScore</p>
              {product.nutriScore ? (
                  <Image
                      src={`/assets/nutri-score-${product.nutriScore.toUpperCase()}.png`}
                      width={125}
                      height={125}
                      alt="NutriScore"
                  />
              ) : (
                  <p className="text-slate-500">Non disponible</p>
              )}
            </div>
          </div>

          <div className="flex gap-10 w-full">
            <Button size="lg" variant="outline" className="w-full">
              Ajouter au panier
            </Button>
            <Button size="lg" className="w-full">
              Acheter
            </Button>
          </div>
          <Separator />
          <p className="text-lg">{product.description}</p>
        </div>
      </div>
  );
}
