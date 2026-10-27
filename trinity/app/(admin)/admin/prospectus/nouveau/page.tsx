import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { backOfficePage } from "@/lib/admin/access";
import { parisDay } from "@/lib/anti-gaspi";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import ProspectusForm from "@/components/admin/prospectus/prospectus-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nouveau prospectus" };

// Nouveau prospectus : celui du magasin du compte, ou du magasin que choisit le siège
export default async function NewProspectusPage() {
  const { store } = await backOfficePage();
  const stores = store ? null : await prisma.store.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div>
      <AdminPageHeader
        back={{ href: "/admin/prospectus", label: "Prospectus" }}
        title="Nouveau prospectus"
        description={store ? `Pour les clients de ${store.name}.` : "Pour les clients du magasin choisi."}
      />
      <ProspectusForm stores={stores} today={parisDay(new Date())} />
    </div>
  );
}
