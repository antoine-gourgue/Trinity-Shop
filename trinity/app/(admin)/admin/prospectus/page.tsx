import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ExternalLink, FilePen, Newspaper, Plus, Tag } from "lucide-react";
import prisma from "@/lib/prisma";
import { backOfficePage } from "@/lib/admin/access";
import { parseAdminParams } from "@/lib/admin/queries";
import { adminProspectuses, type AdminProspectus } from "@/lib/prospectus";
import { PROSPECTUS_STATUS_LABELS, formatProspectusDates, prospectusStatus, type ProspectusStatus } from "@/lib/prospectus-rules";
import { AdminPageHeader, Badge, EmptyState, Panel, StatCard } from "@/components/admin/admin-ui";
import { AdminSelectFilter } from "@/components/admin/admin-toolbar";
import { ProductThumb } from "@/components/admin/product-thumb";
import ProspectusStatusActions from "@/components/admin/prospectus/prospectus-status-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prospectus" };

const STATUS_TONES = { draft: "muted", scheduled: "warning", running: "success", ended: "muted" } as const;

function ProspectusRow({ prospectus, status, showStore }: { prospectus: AdminProspectus; status: ProspectusStatus; showStore: boolean }) {
  const count = prospectus._count.items;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
      <span className="flex -space-x-3">
        {prospectus.items.map(({ product }) => (
          <ProductThumb key={product.id} src={product.picture} alt="" size="sm" />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/prospectus/${prospectus.id}`} className="truncate text-sm font-semibold hover:underline">
            {prospectus.title}
          </Link>
          <Badge tone={STATUS_TONES[status]}>{PROSPECTUS_STATUS_LABELS[status]}</Badge>
        </span>
        <span className="block text-xs text-muted-foreground">
          {[formatProspectusDates(prospectus), `${count} produit${count > 1 ? "s" : ""}`, showStore ? prospectus.store.name : null].filter(Boolean).join(" · ")}
        </span>
      </span>
      {(status === "running" || status === "scheduled") && (
        <Link
          href={`/prospectus/${prospectus.id}`}
          className="flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors hover:bg-secondary"
        >
          <ExternalLink size={14} aria-hidden /> Voir
        </Link>
      )}
      {status !== "ended" && (
        <Link
          href={`/admin/prospectus/${prospectus.id}`}
          className="flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors hover:bg-secondary"
        >
          <FilePen size={14} aria-hidden /> Modifier
        </Link>
      )}
      <ProspectusStatusActions
        id={prospectus.id}
        title={prospectus.title}
        status={status}
        publishable={count > 0 && prospectus.endsAt.getTime() > Date.now()}
      />
    </li>
  );
}

// Prospectus des magasins : leurs produits à prix promo s'affichent sur l'accueil du magasin et
// s'appliquent au panier, à la commande et à la facture de ses clients pendant leurs dates
export default async function ProspectusAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { store } = await backOfficePage();
  const requested = parseAdminParams(await searchParams);
  const stores = store ? [] : await prisma.store.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } });
  const filtered = !store && requested.magasin ? stores.find((entry) => entry.slug === requested.magasin) : undefined;
  const storeId = store?.id ?? filtered?.id;
  const prospectuses = await adminProspectuses(storeId);

  const now = new Date();
  const groups: Record<ProspectusStatus, AdminProspectus[]> = { running: [], scheduled: [], draft: [], ended: [] };
  for (const prospectus of prospectuses) groups[prospectusStatus(prospectus, now)].push(prospectus);
  const productsOnOffer = groups.running.reduce((total, prospectus) => total + prospectus._count.items, 0);
  const showStore = !storeId;

  const sections: { status: ProspectusStatus; title: string; description: string }[] = [
    { status: "running", title: "En cours", description: "Leurs prix s'appliquent en ce moment aux clients du magasin" },
    { status: "scheduled", title: "Programmés", description: "Publiés : ils commencent d'eux-mêmes à leur premier jour" },
    { status: "draft", title: "Brouillons", description: "Visibles seulement ici, tant qu'ils ne sont pas publiés" },
    { status: "ended", title: "Terminés", description: "Les commandes passées pendant leurs dates gardent leurs prix" },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Prospectus"
        description={`${store ? `Prospectus de ${store.name}` : "Prospectus des drives Trinity"} : des produits à prix promo, sur l'accueil du magasin et dans le panier de ses clients.`}
        actions={
          <Link
            href="/admin/prospectus/nouveau"
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
          >
            <Plus size={16} aria-hidden /> Nouveau prospectus
          </Link>
        }
      />
      {!store && (
        <div className="mb-4 sm:max-w-xs">
          <AdminSelectFilter
            label="Tous les magasins"
            param="magasin"
            options={stores.map((entry) => ({ value: entry.slug, label: entry.name }))}
            value={requested.magasin}
          />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="En cours" value={groups.running.length} hint="Sur l'accueil du magasin" icon={Newspaper} tone={groups.running.length ? "bio" : "muted"} />
        <StatCard label="Produits en promo" value={productsOnOffer} hint="Dans les prospectus en cours" icon={Tag} tone={productsOnOffer ? "promo" : "muted"} />
        <StatCard label="Programmés" value={groups.scheduled.length} hint="Publiés, à venir" icon={CalendarClock} tone={groups.scheduled.length ? "highlight" : "muted"} />
        <StatCard label="Brouillons" value={groups.draft.length} hint="À terminer et publier" icon={FilePen} />
      </div>

      {prospectuses.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Newspaper}
            title="Aucun prospectus pour le moment"
            text="Créez le premier : un titre, des dates et les produits à prix promo. Vous verrez sa bannière avant de le publier."
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {sections
            .filter((section) => groups[section.status].length > 0)
            .map((section) => (
              <Panel key={section.status} title={section.title} description={section.description} padded={false}>
                <ul className="divide-y">
                  {groups[section.status].map((prospectus) => (
                    <ProspectusRow key={prospectus.id} prospectus={prospectus} status={section.status} showStore={showStore} />
                  ))}
                </ul>
              </Panel>
            ))}
        </div>
      )}
    </div>
  );
}
