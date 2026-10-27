"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, X } from "lucide-react";
import { ProductThumb } from "@/components/admin/product-thumb";
import { declareLot, searchLotProducts, type LotProductOption } from "@/lib/server-actions/anti-gaspi-admin-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LotFormProps {
  // Magasins proposés au siège ; null pour un compte magasin (son magasin est imposé)
  stores: { id: string; name: string }[] | null;
  // Premier jour accepté (AAAA-MM-JJ) : aujourd'hui
  minDate: string;
}

const inputClass = "h-11 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-primary";

// Déclaration d'un lot à date courte : produit (nom ou code-barres), quantité et date limite
export default function LotForm({ stores, minDate }: LotFormProps) {
  const router = useRouter();
  const [storeId, setStoreId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<LotProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [product, setProduct] = useState<LotProductOption | null>(null);
  const [quantity, setQuantity] = useState("");
  const [bestBefore, setBestBefore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Recherche après une courte pause dans la saisie
  useEffect(() => {
    if (product || query.trim().length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await searchLotProducts(query, storeId || null);
      if (!cancelled) {
        setOptions(found);
        setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, storeId, product]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!product) {
      setError("Choisissez un produit.");
      return;
    }
    startTransition(async () => {
      const result = await declareLot({
        storeId: storeId || null,
        productId: product.id,
        quantity: Number(quantity),
        bestBefore,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast({ description: `Lot déclaré : ${quantity} × ${product.name}.` });
      setProduct(null);
      setQuery("");
      setQuantity("");
      setBestBefore("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
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

      <div>
        <span className="mb-1 block text-sm font-bold">Produit</span>
        {product ? (
          <div className="flex items-center gap-3 rounded-2xl border bg-secondary/40 p-2 pr-3">
            <ProductThumb src={product.picture} alt="" size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{product.name}</span>
              <span className="block text-xs text-muted-foreground">
                {[product.netContent, product.stock !== null && `${product.stock} en stock`].filter(Boolean).join(" · ")}
              </span>
            </span>
            <button type="button" onClick={() => setProduct(null)} aria-label="Changer de produit" className="rounded-full p-1.5 hover:bg-white">
              <X size={16} aria-hidden />
            </button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom ou code-barres"
                aria-label="Rechercher un produit"
                className={cn(inputClass, "pl-10")}
              />
              {searching && <Loader2 size={16} className="absolute right-10 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
            </div>
            {stores && !storeId && query.trim().length >= 2 && (
              <p className="mt-2 text-xs text-muted-foreground">Choisissez le magasin pour voir son stock de chaque produit.</p>
            )}
            {options.length > 0 && (
              <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-2xl border bg-white p-1">
                {options.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => setProduct(option)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-secondary"
                    >
                      <ProductThumb src={option.picture} alt="" size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{option.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[option.netContent, option.barCode, option.stock !== null && `${option.stock} en stock`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Quantité</span>
          <input
            type="number"
            min={1}
            max={product?.stock || undefined}
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Date limite (DLC ou DDM)</span>
          <input type="date" min={minDate} required value={bestBefore} onChange={(event) => setBestBefore(event.target.value)} className={inputClass} />
        </label>
      </div>

      {error && <p className="rounded-2xl bg-promo/10 px-4 py-3 text-sm font-semibold text-promo">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Plus size={16} aria-hidden />}
        Déclarer le lot
      </button>
    </form>
  );
}
