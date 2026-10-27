import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { backOfficePage } from "@/lib/admin/access";
import { parisDay } from "@/lib/anti-gaspi";
import { prospectusForEdit } from "@/lib/prospectus";
import { PROSPECTUS_STATUS_LABELS, formatProspectusDates, prospectusDays, prospectusStatus } from "@/lib/prospectus-rules";
import { toPriceInput } from "@/lib/format";
import { AdminPageHeader, Badge } from "@/components/admin/admin-ui";
import ProspectusForm from "@/components/admin/prospectus/prospectus-form";
import ProspectusStatusActions from "@/components/admin/prospectus/prospectus-status-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prospectus" };

// Modification d'un prospectus ; terminé, il ne se modifie plus
export default async function EditProspectusPage({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await backOfficePage();
  const prospectus = await prospectusForEdit((await params).id);
  // Le prospectus d'un autre magasin n'existe pas pour un compte magasin
  if (!prospectus || (store && prospectus.storeId !== store.id)) notFound();

  const status = prospectusStatus(prospectus);
  const { firstDay, lastDay } = prospectusDays(prospectus);

  return (
    <div>
      <AdminPageHeader
        back={{ href: "/admin/prospectus", label: "Prospectus" }}
        title={prospectus.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {prospectus.store.name} · {formatProspectusDates(prospectus)}
            <Badge tone={status === "running" ? "success" : status === "scheduled" ? "warning" : "muted"}>{PROSPECTUS_STATUS_LABELS[status]}</Badge>
          </span>
        }
        actions={
          <ProspectusStatusActions
            id={prospectus.id}
            title={prospectus.title}
            status={status}
            publishable={prospectus.items.length > 0 && prospectus.endsAt.getTime() > Date.now()}
          />
        }
      />
      {status === "ended" ? (
        <p className="rounded-3xl border bg-white p-6 text-sm text-muted-foreground">
          Ce prospectus est terminé : il ne se modifie plus. Les commandes passées pendant ses dates gardent leurs prix.
        </p>
      ) : (
        <ProspectusForm
          stores={null}
          today={parisDay(new Date())}
          initial={{
            id: prospectus.id,
            title: prospectus.title,
            firstDay,
            lastDay,
            status,
            items: prospectus.items.map(({ price, product }) => ({
              product: { ...product, barCode: product.barCode.toString() },
              price: toPriceInput(price),
            })),
          }}
        />
      )}
    </div>
  );
}
