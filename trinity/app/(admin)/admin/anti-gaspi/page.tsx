import type { Metadata } from "next";
import { AlertTriangle, HandHeart, Recycle, ShoppingBag, Trash2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { getAntiGaspiBoard, parseAdminParams, type AdminLot, type AntiGaspiView } from "@/lib/admin/queries";
import { formatRate } from "@/lib/admin/operations";
import { formatBestBefore, lotDay, lotPricing } from "@/lib/anti-gaspi";
import { findRayonForCategories } from "@/lib/rayons";
import { formatPrice } from "@/lib/format";
import { backOfficePage } from "@/lib/admin/access";
import { AdminPageHeader, AdminPagination, Badge, EmptyState, Panel, StatCard, adminHref, formatDate } from "@/components/admin/admin-ui";
import { AdminFilterTabs, AdminSelectFilter } from "@/components/admin/admin-toolbar";
import { ProductThumb } from "@/components/admin/admin-bits";
import LotActions from "@/components/admin/anti-gaspi/lot-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anti-gaspi" };

// Vues paginées sous les lots urgents
const VIEWS = [
  { value: "en-vente", label: "En vente en ligne" },
  { value: "bientot", label: "Bientôt en vente" },
  { value: "clos", label: "Lots clos · 30 j" },
] as const satisfies readonly { value: AntiGaspiView; label: string }[];

function parseView(raw: string | string[] | undefined): AntiGaspiView {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return VIEWS.find((view) => view.value === value)?.value ?? "en-vente";
}

// Premier jour de mise en vente d'un lot (« lundi 3 novembre »), selon sa fenêtre anti-gaspi
function saleStart(lot: AdminLot) {
  const start = new Date(new Date(`${lotDay(lot.bestBefore)}T00:00:00Z`).getTime() - lot.markdownDays * 86_400_000);
  return formatBestBefore(start);
}

// Rayon du produit, pour retrouver le lot en magasin
function rayonOf(lot: AdminLot) {
  const match = findRayonForCategories(lot.product.categories.map((category) => category.categoryName));
  return match ? (match.subCategory?.label ?? match.rayon.shortName) : null;
}

// Un lot à retrouver en rayon : photo, rayon, code-barres, date et unités restantes
function LotRow({ lot, showStore, children }: { lot: AdminLot; showStore: boolean; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
      <ProductThumb src={lot.product.picture} alt="" size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{lot.product.name}</span>
        <span className="block text-xs text-muted-foreground">
          {[
            `${lot.quantity} unité${lot.quantity > 1 ? "s" : ""} jusqu'au ${formatBestBefore(lot.bestBefore)}`,
            rayonOf(lot),
            lot.product.barCode.toString(),
            showStore ? lot.store.name : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      {children}
    </li>
  );
}

// Anti-gaspi : lots à date courte du magasin, vendus en ligne à prix réduit puis donnés ou jetés
export default async function AntiGaspiPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { store } = await backOfficePage();
  const raw = await searchParams;
  const requested = parseAdminParams(raw);
  const view = parseView(raw.vue);
  const stores = store ? [] : await prisma.store.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } });
  const filtered = !store && requested.magasin ? stores.find((entry) => entry.slug === requested.magasin) : undefined;
  const board = await getAntiGaspiBoard(store?.id ?? filtered?.id, view, requested.page);
  const now = new Date();
  const showStore = !store && !filtered;
  // Périmés (retirés de la vente la nuit) : à jeter ; date du jour : à donner aujourd'hui
  const { expired, lastDay } = board;
  const toHandle = board.urgentCounts.expired + board.urgentCounts.lastDay;
  const pageHref = (page: number) => adminHref("/admin/anti-gaspi", { magasin: requested.magasin, vue: view === "en-vente" ? undefined : view, page });

  return (
    <div>
      <AdminPageHeader
        title="Anti-gaspi"
        description={`${store ? `Dates courtes de ${store.name}` : "Dates courtes des drives Trinity"} : vendues en ligne à prix réduit, données le dernier jour, jetées une fois périmées.`}
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
        <StatCard
          label="À traiter aujourd'hui"
          value={toHandle}
          hint={`${board.urgentCounts.expired} périmé${board.urgentCounts.expired > 1 ? "s" : ""} à jeter · ${board.urgentCounts.lastDay} à donner`}
          icon={AlertTriangle}
          tone={toHandle ? "promo" : "muted"}
        />
        <StatCard
          label="En vente en ligne"
          value={board.unitsOnSale}
          hint={`${board.counts["en-vente"]} lot${board.counts["en-vente"] > 1 ? "s" : ""} à prix réduit`}
          icon={ShoppingBag}
        />
        <StatCard
          label="Sauvés · 30 j"
          value={board.totals.saved}
          hint={`${board.totals.sold} vendus, ${board.totals.donated} donnés · ${formatRate(board.totals.rescueRate)} sauvés`}
          icon={HandHeart}
          tone="bio"
        />
        <StatCard label="Jetés · 30 j" value={board.totals.wasted} hint="Unités perdues" icon={Trash2} tone={board.totals.wasted ? "promo" : "muted"} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Panel title="Comment ça marche" description="Automatique, à partir des lots du stock">
          <ol className="space-y-3 text-sm">
            <li>
              <span className="font-bold">Chaque lot a sa date.</span> Il entre en stock à la réception d&apos;un réassort ; les
              commandes reçoivent les dates les plus longues.
            </li>
            <li>
              <span className="font-bold">À l&apos;approche de la date, il passe en vente à prix réduit</span> : 5 jours avant
              au plus (la veille seulement pour le pain), −20 % puis −30 % à J-3, −40 % à J-2 et −50 % la veille.
            </li>
            <li>
              <span className="font-bold">Le jour de la date, donnez ce qui reste</span> à l&apos;association partenaire
              (« Donné ») : il ne se vend plus en ligne, le premier retrait étant le lendemain.
            </li>
            <li>
              <span className="font-bold">Date passée : le lot est retiré de la vente</span> pendant la nuit et passe « à
              jeter ». Retirez-le du rayon grâce au rayon et au code-barres indiqués, puis confirmez « Jeté » : un produit
              périmé ne se donne plus.
            </li>
          </ol>
        </Panel>

        <div className="space-y-6 xl:col-span-2">
          {expired.length > 0 && (
            <Panel
              title={`Périmés : à jeter (${board.urgentCounts.expired})`}
              description={`Retirés de la vente : à enlever du rayon, puis à confirmer jetés${board.urgentCounts.expired > expired.length ? ` · ${expired.length} premiers affichés` : ""}`}
              padded={false}
            >
              <ul className="divide-y">
                {expired.map((lot) => (
                  <LotRow key={lot.id} lot={lot} showStore={showStore}>
                    <Badge tone="danger">Périmé</Badge>
                    <LotActions lotId={lot.id} productName={lot.product.name} quantity={lot.quantity} expired />
                  </LotRow>
                ))}
              </ul>
            </Panel>
          )}

          {lastDay.length > 0 && (
            <Panel
              title={`Dernier jour : à donner (${board.urgentCounts.lastDay})`}
              description={`Date limite aujourd'hui : plus vendu en ligne, à donner avant ce soir${board.urgentCounts.lastDay > lastDay.length ? ` · ${lastDay.length} premiers affichés` : ""}`}
              padded={false}
            >
              <ul className="divide-y">
                {lastDay.map((lot) => (
                  <LotRow key={lot.id} lot={lot} showStore={showStore}>
                    <Badge tone="warning">Aujourd&apos;hui</Badge>
                    <LotActions lotId={lot.id} productName={lot.product.name} quantity={lot.quantity} />
                  </LotRow>
                ))}
              </ul>
            </Panel>
          )}

          <div className="space-y-3">
            <AdminFilterTabs filters={VIEWS} active={view} counts={board.counts} param="vue" />
            <Panel
              title={VIEWS.find((entry) => entry.value === view)?.label}
              description={
                view === "en-vente"
                  ? "Prix réduit automatiquement à l'approche de la date, dates les plus proches d'abord"
                  : view === "bientot"
                    ? "Dates courtes pas encore dans leur fenêtre anti-gaspi"
                    : "Lots fermés avec des unités données ou jetées"
              }
              padded={false}
            >
              {board.lots.length ? (
                <ul className="divide-y">
                  {board.lots.map((lot) => {
                    if (view === "en-vente") {
                      const pricing = lotPricing(lot, lot.product.price, now);
                      return (
                        <LotRow key={lot.id} lot={lot} showStore={showStore}>
                          {pricing && (
                            <>
                              <span className="text-right text-sm">
                                <span className="block text-xs text-muted-foreground line-through">{formatPrice(lot.product.price)}</span>
                                <span className="block font-black text-bio">{formatPrice(pricing.unitPrice)}</span>
                              </span>
                              <Badge tone="success">−{pricing.percent} %</Badge>
                            </>
                          )}
                          <LotActions lotId={lot.id} productName={lot.product.name} quantity={lot.quantity} />
                        </LotRow>
                      );
                    }
                    if (view === "bientot") {
                      return (
                        <LotRow key={lot.id} lot={lot} showStore={showStore}>
                          <Badge tone="muted">En vente le {saleStart(lot)}</Badge>
                        </LotRow>
                      );
                    }
                    return (
                      <LotRow key={lot.id} lot={lot} showStore={showStore}>
                        <span className="flex flex-wrap gap-1.5">
                          {lot.soldQuantity > 0 && <Badge tone="brand">{lot.soldQuantity} vendus</Badge>}
                          {lot.donatedQuantity > 0 && <Badge tone="success">{lot.donatedQuantity} donnés</Badge>}
                          {lot.wastedQuantity > 0 && <Badge tone="danger">{lot.wastedQuantity} jetés</Badge>}
                        </span>
                        <span className="text-xs text-muted-foreground">{lot.closedAt ? formatDate(lot.closedAt) : ""}</span>
                      </LotRow>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon={Recycle}
                  title={view === "en-vente" ? "Aucun lot en vente" : view === "bientot" ? "Aucun lot bientôt en vente" : "Aucun lot clos sur 30 jours"}
                  text={view === "en-vente" ? "Les lots apparaissent ici à l'approche de leur date limite." : undefined}
                />
              )}
              <div className="border-t">
                <AdminPagination page={board.page} pageCount={board.pageCount} total={board.counts[view]} href={pageHref} unit={["lot", "lots"]} />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
