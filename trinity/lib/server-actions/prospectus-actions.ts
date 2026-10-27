"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { AccessDeniedError, requireBackOffice } from "@/services/auth/guards";
import { parisDay } from "@/lib/anti-gaspi";
import { isBarcode } from "@/lib/barcode";
import {
  MAX_PROSPECTUS_DAYS,
  MAX_PROSPECTUS_ITEMS,
  prospectusLength,
  prospectusPeriod,
  prospectusPriceError,
  prospectusStatus,
} from "@/lib/prospectus-rules";

// Prospectus du back-office : un compte magasin crée ceux de son magasin, le siège ceux du magasin
// qu'il choisit. Publié, un prospectus fixe le prix de ses produits pour les clients du magasin.

export type ProspectusResult = { ok: true; id: string } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

// Prix saisis en euros, stockés en millièmes d'euro
const euros = (value: number) => Math.round(value * 100) * 10;

const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");

const prospectusSchema = z.object({
  id: z.string().min(1).nullable(),
  storeId: z.string().min(1).nullable(),
  title: z.string().trim().min(3, "Donnez un titre au prospectus.").max(60, "Titre trop long (60 caractères au plus)."),
  firstDay: DAY,
  lastDay: DAY,
  items: z
    .array(z.object({ productId: z.string().min(1), price: z.number({ invalid_type_error: "Prix invalide." }).positive("Prix invalide.") }))
    .min(1, "Ajoutez au moins un produit.")
    .max(MAX_PROSPECTUS_ITEMS, `${MAX_PROSPECTUS_ITEMS} produits au plus par prospectus.`),
  publish: z.boolean(),
});

export type ProspectusInput = z.infer<typeof prospectusSchema>;

// Prospectus du magasin du compte (tous pour le siège)
async function ownProspectus(id: string) {
  const access = await requireBackOffice();
  const prospectus = await prisma.prospectus.findUnique({
    where: { id },
    select: { id: true, storeId: true, publishedAt: true, startsAt: true, endsAt: true, _count: { select: { items: true } } },
  });
  if (prospectus && access.store && prospectus.storeId !== access.store.id) throw new AccessDeniedError();
  return prospectus;
}

// Création ou modification ; avec publish, le prospectus est publié dans la foulée
export async function saveProspectus(input: ProspectusInput): Promise<ProspectusResult> {
  const access = await requireBackOffice();
  const parsed = prospectusSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Prospectus invalide.");
  const data = parsed.data;

  const existing = data.id ? await ownProspectus(data.id) : null;
  if (data.id && !existing) return fail("Prospectus introuvable.");
  const status = existing ? prospectusStatus(existing) : "draft";
  if (status === "ended") return fail("Ce prospectus est terminé : il ne se modifie plus.");
  const storeId = access.store?.id ?? existing?.storeId ?? data.storeId;
  if (!storeId) return fail("Choisissez le magasin du prospectus.");

  // Dates : un prospectus en cours garde son premier jour ; sinon il commence aujourd'hui au plus tôt
  const today = parisDay(new Date());
  const firstDay = status === "running" && existing ? parisDay(existing.startsAt) : data.firstDay;
  if (status !== "running" && firstDay < today) return fail("Le prospectus ne peut pas commencer avant aujourd'hui.");
  if (data.lastDay < firstDay) return fail("Le dernier jour doit suivre le premier.");
  if (data.lastDay < today) return fail("Le dernier jour est déjà passé.");
  if (prospectusLength(firstDay, data.lastDay) > MAX_PROSPECTUS_DAYS) return fail(`Un prospectus dure ${MAX_PROSPECTUS_DAYS} jours au plus.`);
  const { startsAt, endsAt } = prospectusPeriod(firstDay, data.lastDay);

  // Chaque prix est une vraie remise sur le prix actuel du produit
  const productIds = data.items.map((item) => item.productId);
  if (new Set(productIds).size !== productIds.length) return fail("Un produit apparaît deux fois.");
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, price: true, hidden: true } });
  const byId = new Map(products.map((product) => [product.id, product]));
  const items: { productId: string; price: number }[] = [];
  for (const item of data.items) {
    const product = byId.get(item.productId);
    if (!product) return fail("Un produit du prospectus n'existe plus.");
    if (product.hidden) return fail(`« ${product.name} » est retiré du catalogue.`);
    const price = euros(item.price);
    const error = prospectusPriceError(price, product.price);
    if (error) return fail(`${product.name} : ${error}`);
    items.push({ productId: product.id, price });
  }

  const publishedAt = data.publish ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null);
  const saved = existing
    ? await prisma.$transaction(async (tx) => {
        await tx.prospectusItem.deleteMany({ where: { prospectusId: existing.id } });
        return tx.prospectus.update({
          where: { id: existing.id },
          data: { title: data.title, startsAt, endsAt, publishedAt, items: { create: items } },
          select: { id: true },
        });
      })
    : await prisma.prospectus.create({
        data: { storeId, title: data.title, startsAt, endsAt, publishedAt, items: { create: items } },
        select: { id: true },
      });

  revalidatePath("/admin/prospectus");
  revalidatePath("/", "layout");
  return { ok: true, id: saved.id };
}

// Publication d'un brouillon : ses prix s'appliqueront de son premier à son dernier jour
export async function publishProspectus(id: string): Promise<ActionResult> {
  const prospectus = await ownProspectus(id);
  if (!prospectus) return fail("Prospectus introuvable.");
  if (prospectus.publishedAt) return fail("Ce prospectus est déjà publié.");
  if (prospectus.endsAt.getTime() <= Date.now()) return fail("Les dates de ce prospectus sont passées : modifiez-les avant de le publier.");
  if (prospectus._count.items === 0) return fail("Ajoutez au moins un produit avant de publier.");
  await prisma.prospectus.update({ where: { id }, data: { publishedAt: new Date() } });
  revalidatePath("/admin/prospectus");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Retour en brouillon d'un prospectus programmé (pas encore commencé)
export async function unpublishProspectus(id: string): Promise<ActionResult> {
  const prospectus = await ownProspectus(id);
  if (!prospectus) return fail("Prospectus introuvable.");
  if (prospectusStatus(prospectus) !== "scheduled") return fail("Seul un prospectus programmé repasse en brouillon.");
  await prisma.prospectus.update({ where: { id }, data: { publishedAt: null } });
  revalidatePath("/admin/prospectus");
  return { ok: true };
}

// Arrêt d'un prospectus en cours : ses prix cessent tout de suite
export async function stopProspectus(id: string): Promise<ActionResult> {
  const prospectus = await ownProspectus(id);
  if (!prospectus) return fail("Prospectus introuvable.");
  if (prospectusStatus(prospectus) !== "running") return fail("Ce prospectus n'est pas en cours.");
  await prisma.prospectus.update({ where: { id }, data: { endsAt: new Date() } });
  revalidatePath("/admin/prospectus");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Suppression d'un prospectus qui n'est pas en cours (un prospectus en cours s'arrête d'abord)
export async function deleteProspectus(id: string): Promise<ActionResult> {
  const prospectus = await ownProspectus(id);
  if (!prospectus) return fail("Prospectus introuvable.");
  if (prospectusStatus(prospectus) === "running") return fail("Arrêtez ce prospectus avant de le supprimer.");
  await prisma.prospectus.delete({ where: { id } });
  revalidatePath("/admin/prospectus");
  return { ok: true };
}

export interface ProspectusProductOption {
  id: string;
  name: string;
  netContent: string | null;
  picture: string;
  barCode: string;
  // Prix actuel (millièmes d'euro) : le prix du prospectus doit être plus bas
  price: number;
  regularPrice: number | null;
}

// Produits à mettre au prospectus : recherche par nom, marque ou code-barres
export async function searchProspectusProducts(query: string): Promise<ProspectusProductOption[]> {
  await requireBackOffice();
  const search = query.trim();
  if (search.length < 2) return [];
  const products = await prisma.product.findMany({
    where: {
      hidden: false,
      ...(isBarcode(search)
        ? { barCode: BigInt(search) }
        : { OR: [{ name: { contains: search, mode: "insensitive" } }, { brand: { name: { contains: search, mode: "insensitive" } } }] }),
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true, netContent: true, picture: true, barCode: true, price: true, regularPrice: true },
  });
  return products.map(({ barCode, ...product }) => ({ ...product, barCode: barCode.toString() }));
}
