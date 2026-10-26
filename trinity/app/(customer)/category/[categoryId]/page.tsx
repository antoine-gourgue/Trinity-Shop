import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { findRayonForCategories, rayonHref } from "@/lib/rayons";

// Ancienne URL de catégorie : on renvoie vers le rayon correspondant
export default async function CategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { name: true },
  });
  if (!category) notFound();

  const match = findRayonForCategories([category.name]);
  redirect(
    match
      ? rayonHref(match.rayon, match.subCategory?.slug)
      : `/produits?categorie=${encodeURIComponent(category.name)}`
  );
}
