"use server";

import prisma from "@/lib/prisma";

export default async function getCategoriesActions() {
  const dbCategories = await prisma.category.findMany({
    select: { id: true, name: true },
  });

  return dbCategories;
}
