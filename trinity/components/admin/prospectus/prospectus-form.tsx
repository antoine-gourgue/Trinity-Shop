"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Send, Trash2 } from "lucide-react";
import { ProductThumb } from "@/components/admin/product-thumb";
import { BannerCard } from "@/components/catalog/operation-banners";
import {
  saveProspectus,
  searchProspectusProducts,
  type ProspectusProductOption,
} from "@/lib/server-actions/prospectus-actions";
import {
  MAX_PROSPECTUS_DAYS,
  MAX_PROSPECTUS_ITEMS,
  prospectusBanner,
  prospectusPeriod,
  prospectusPriceError,
  type ProspectusStatus,
} from "@/lib/prospectus-rules";
import { discountPercent, formatPrice } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ProspectusFormValues {
  id: string;
  title: string;
  firstDay: string;
  lastDay: string;
  status: ProspectusStatus;
  items: { product: ProspectusProductOption; price: string }[];
}

interface ProspectusFormProps {
  // Magasins proposés au siège pour un nouveau prospectus ; null pour un compte magasin ou une modification
  stores: { id: string; name: string }[] | null;
  initial?: ProspectusFormValues;
  // Aujourd'hui (AAAA-MM-JJ, heure de Paris) : premier jour possible
  today: string;
}

const inputClass = "h-11 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground";

// Prix saisi en euros (« 1,29 »), en millièmes d'euro ; null s'il n'est pas lisible
function parsePrice(value: string) {
  const euros = Number.parseFloat(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(euros) && euros > 0 ? Math.round(euros * 100) * 10 : null;
}

// Création et modification d'un prospectus, avec l'aperçu de sa bannière sur l'accueil du magasin
export default function ProspectusForm({ stores, initial, today }: ProspectusFormProps) {
  const router = useRouter();
  const [storeId, setStoreId] = useState("");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [firstDay, setFirstDay] = useState(initial?.firstDay ?? today);
  const [lastDay, setLastDay] = useState(initial?.lastDay ?? "");
  const [items, setItems] = useState(initial?.items ?? []);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ProspectusProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const status = initial?.status ?? "draft";
  const running = status === "running";

  // Recherche après une courte pause dans la saisie (même fonctionnement que le réassort)
  useEffect(() => {
    if (query.trim().length < 2) {
      setOptions([]);
      setSearching(false);
      setSearchedFor(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await searchProspectusProducts(query).catch(() => []);
      if (!cancelled) {
        setOptions(found);
        setSearching(false);
        setSearchedFor(query);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const addProduct = (product: ProspectusProductOption) => {
    if (!items.some((item) => item.product.id === product.id)) setItems([...items, { product, price: "" }]);
    setQuery("");
  };
  const setPrice = (productId: string, price: string) =>
    setItems(items.map((item) => (item.product.id === productId ? { ...item, price } : item)));
  const removeProduct = (productId: string) => setItems(items.filter((item) => item.product.id !== productId));

  // Aperçu : les produits dont le prix est valable, avec la remise que verront les clients
  const priced = items.flatMap(({ product, price }) => {
    const value = parsePrice(price);
    if (value === null || prospectusPriceError(value, product.price)) return [];
    return [{ ...product, percent: discountPercent(value, product.regularPrice ?? product.price) ?? 0 }];
  });
  // Dates en cours de saisie : l'aperçu reste lisible même incomplètes
  const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  const start = isDay(firstDay) ? firstDay : today;
  const end = isDay(lastDay) && lastDay >= start ? lastDay : start;
  const banner = prospectusBanner(
    { id: initial?.id ?? "apercu", title: title.trim() || "Titre du prospectus", endsAt: prospectusPeriod(start, end).endsAt },
    priced
  );

  const submit = (publish: boolean) => {
    setError(null);
    const parsed = items.map((item) => ({ productId: item.product.id, price: parsePrice(item.price) }));
    const missing = items.find((_, index) => parsed[index].price === null);
    if (missing) {
      setError(`Indiquez le prix promo de « ${missing.product.name} ».`);
      return;
    }
    startTransition(async () => {
      const result = await saveProspectus({
        id: initial?.id ?? null,
        storeId: storeId || null,
        title,
        firstDay,
        lastDay,
        items: parsed.map((item) => ({ productId: item.productId, price: (item.price ?? 0) / 1000 })),
        publish,
      }).catch(() => ({ ok: false as const, error: "L'enregistrement n'a pas abouti. Réessayez." }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast({ description: publish ? "Prospectus publié." : "Prospectus enregistré." });
      router.push("/admin/prospectus");
      router.refresh();
    });
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-3xl border bg-white p-5">
          <h2 className="font-extrabold">Informations</h2>
          {stores && (
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Magasin</span>
              <select required value={storeId} onChange={(event) => setStoreId(event.target.value)} className={inputClass}>
                <option value="">Choisir un magasin</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Titre</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} placeholder="Ex. : Les prix d'automne" className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Premier jour</span>
              <input type="date" value={firstDay} min={today} disabled={running} onChange={(event) => setFirstDay(event.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Dernier jour</span>
              <input type="date" value={lastDay} min={firstDay > today ? firstDay : today} onChange={(event) => setLastDay(event.target.value)} className={inputClass} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {running
              ? "Le prospectus est en cours : son premier jour ne change plus, sa fin peut être avancée ou repoussée."
              : `Du premier jour à minuit au dernier jour inclus, ${MAX_PROSPECTUS_DAYS} jours au plus.`}
          </p>
        </section>

        <section className="space-y-4 rounded-3xl border bg-white p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-extrabold">Produits</h2>
            <span className="text-xs text-muted-foreground">
              {items.length} / {MAX_PROSPECTUS_ITEMS}
            </span>
          </div>

          <div>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ajouter un produit : nom, marque ou code-barres"
                aria-label="Rechercher un produit à ajouter"
                disabled={items.length >= MAX_PROSPECTUS_ITEMS}
                className={cn(inputClass, "pl-10")}
              />
              {/* Position et rotation sur deux éléments : animate-spin remplacerait le centrage (même propriété transform) */}
              {searching && (
                <span className="absolute right-10 top-1/2 flex -translate-y-1/2" aria-hidden>
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                </span>
              )}
            </div>
            {!searching && searchedFor === query && options.length === 0 && (
              <p className="mt-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">Aucun produit trouvé pour « {query.trim()} ».</p>
            )}
            {options.length > 0 && (
              <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-2xl border bg-white p-1">
                {options.map((option) => {
                  const added = items.some((item) => item.product.id === option.id);
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        disabled={added}
                        onClick={() => addProduct(option)}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-secondary disabled:opacity-50"
                      >
                        <ProductThumb src={option.picture} alt="" size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{option.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {[option.netContent, `${formatPrice(option.price)} actuellement`, added && "déjà ajouté"].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {items.length > 0 ? (
            <ul className="divide-y rounded-2xl border">
              {items.map(({ product, price }) => {
                const value = parsePrice(price);
                const problem = price.trim() && value === null ? "Prix invalide." : value !== null ? prospectusPriceError(value, product.price) : null;
                const percent = value !== null && !problem ? discountPercent(value, product.regularPrice ?? product.price) : null;
                return (
                  <li key={product.id} className="flex flex-wrap items-center gap-3 p-3">
                    <ProductThumb src={product.picture} alt="" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{product.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        Prix actuel {formatPrice(product.price)}
                        {product.regularPrice && ` (promo nationale, au lieu de ${formatPrice(product.regularPrice)})`}
                      </span>
                      {problem && <span className="block text-xs font-semibold text-promo">{problem}</span>}
                    </span>
                    <label className="flex items-center gap-2">
                      <span className="sr-only">Prix promo de {product.name}, en euros</span>
                      <input
                        inputMode="decimal"
                        value={price}
                        onChange={(event) => setPrice(product.id, event.target.value)}
                        placeholder="Prix €"
                        className={cn(inputClass, "h-10 w-24 rounded-xl px-3 text-right font-bold", problem && "border-promo")}
                      />
                      <span className={cn("w-14 text-right text-sm font-black", percent ? "text-promo" : "text-muted-foreground")}>
                        {percent ? `−${percent} %` : "—"}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      aria-label={`Retirer ${product.name}`}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-promo/10 hover:text-promo"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
              Cherchez les produits du prospectus et indiquez leur prix promo dans le magasin.
            </p>
          )}
        </section>

        {error && <p className="rounded-2xl bg-promo/10 px-4 py-3 text-sm font-semibold text-promo">{error}</p>}

        <div className="flex flex-wrap justify-end gap-3">
          {status === "draft" ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => submit(false)}
                className="h-11 rounded-full border px-5 text-sm font-bold transition-colors hover:bg-secondary disabled:opacity-60"
              >
                Enregistrer le brouillon
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => submit(true)}
                className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
                Publier
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => submit(false)}
              className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
              Enregistrer les modifications
            </button>
          )}
        </div>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-6">
        <h2 className="font-extrabold">Aperçu sur l&apos;accueil du magasin</h2>
        <BannerCard banner={banner} preview />
        <p className="text-xs text-muted-foreground">
          La bannière ouvre le prospectus complet. Pendant ses dates, les clients du magasin paient ces prix dans leur panier, à la
          commande et sur leur facture.
        </p>
      </aside>
    </div>
  );
}
