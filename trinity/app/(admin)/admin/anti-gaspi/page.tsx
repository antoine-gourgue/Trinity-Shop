import type { Metadata } from "next";
import { AlertTriangle, HandHeart, Recycle, ShoppingBag, Trash2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { getAntiGaspiBoard, parseAdminParams, type AdminLot } from "@/lib/admin/queries";
import { formatRate } from "@/lib/admin/operations";
import { formatBestBefore, lotDay, lotPricing, lotStage } from "@/lib/anti-gaspi";
import { findRayonForCategories } from "@/lib/rayons";
import { formatPrice } from "@/lib/format";
import { backOfficePage } from "@/lib/admin/access";
import { AdminPageHeader, Badge, EmptyState, Panel, StatCard, formatDate } from "@/components/admin/admin-ui";
import { AdminSelectFilter } from "@/components/admin/admin-toolbar";
import { ProductThumb } from "@/components/admin/admin-bits";
import LotActions from "@/components/admin/anti-gaspi/lot-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anti-gaspi" };

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
  const requested = parseAdminParams(await searchParams);
  const stores = store ? [] : await prisma.store.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } });
  const filtered = !store && requested.magasin ? stores.find((entry) => entry.slug === requested.magasin) : undefined;
  const board = await getAntiGaspiBoard(store?.id ?? filtered?.id);
  const now = new Date();
  const showStore = !store && !filtered;

  const stage = (wanted: ReturnType<typeof lotStage>) => board.open.filter((lot) => lotStage(lot, now) === wanted);
  // Périmés (retirés de la vente la nuit) : à jeter ; date du jour : à donner aujourd'hui
  const expired = stage("expired");
  const lastDay = stage("last-day");
  const onSale = stage("on-sale");
  // Dates courtes pas encore dans leur fenêtre (le pain n'est soldé que la veille)
  const upcoming = stage("in-stock");
  const unitsOnSale = onSale.reduce((total, lot) => total + lot.quantity, 0);
  const toHandle = expired.length + lastDay.length;

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
          hint={`${expired.length} périmé${expired.length > 1 ? "s" : ""} à jeter · ${lastDay.length} à donner`}
          icon={AlertTriangle}
          tone={toHandle ? "promo" : "muted"}
        />
        <StatCard label="En vente en ligne" value={unitsOnSale} hint={`${onSale.length} lot${onSale.length > 1 ? "s" : ""} à prix réduit`} icon={ShoppingBag} />
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
            <Panel title="Périmés : à jeter" description="Retirés de la vente : à enlever du rayon, puis à confirmer jetés" padded={false}>
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
            <Panel title="Dernier jour : à donner" description="Date limite aujourd'hui : plus vendu en ligne, à donner avant ce soir" padded={false}>
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

          <Panel title="En vente en ligne" description="Prix réduit automatiquement à l'approche de la date" padded={false}>
            {onSale.length ? (
              <ul className="divide-y">
                {onSale.map((lot) => {
                  const pricing = lotPricing(lot, lot.product.price, now)!;
                  return (
                    <LotRow key={lot.id} lot={lot} showStore={showStore}>
                      <span className="text-right text-sm">
                        <span className="block text-xs text-muted-foreground line-through">{formatPrice(lot.product.price)}</span>
                        <span className="block font-black text-bio">{formatPrice(pricing.unitPrice)}</span>
                      </span>
                      <Badge tone="success">−{pricing.percent} %</Badge>
                      <LotActions lotId={lot.id} productName={lot.product.name} quantity={lot.quantity} />
                    </LotRow>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Recycle} title="Aucun lot en vente" text="Les lots apparaissent ici à l'approche de leur date limite." />
            )}
          </Panel>

          {upcoming.length > 0 && (
            <Panel title="Bientôt en vente" padded={false}>
              <ul className="divide-y">
                {upcoming.map((lot) => (
                  <LotRow key={lot.id} lot={lot} showStore={showStore}>
                    <Badge tone="muted">En vente le {saleStart(lot)}</Badge>
                  </LotRow>
                ))}
              </ul>
            </Panel>
          )}

          {board.closed.length > 0 && (
            <Panel title="Lots clos" description="30 derniers jours" padded={false}>
              <ul className="divide-y">
                {board.closed.map((lot) => (
                  <LotRow key={lot.id} lot={lot} showStore={showStore}>
                    <span className="flex flex-wrap gap-1.5">
                      {lot.soldQuantity > 0 && <Badge tone="brand">{lot.soldQuantity} vendus</Badge>}
                      {lot.donatedQuantity > 0 && <Badge tone="success">{lot.donatedQuantity} donnés</Badge>}
                      {lot.wastedQuantity > 0 && <Badge tone="danger">{lot.wastedQuantity} jetés</Badge>}
                    </span>
                    <span className="text-xs text-muted-foreground">{lot.closedAt ? formatDate(lot.closedAt) : ""}</span>
                  </LotRow>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
