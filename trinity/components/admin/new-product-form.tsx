"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, ScanBarcode, Search } from "lucide-react";
import { lookupProductBarcode, type BarcodeLookupResult } from "@/lib/server-actions/admin-actions";
import type { ProductProposal } from "@/lib/admin/product-proposal";
import { formatBrand, formatPrice, toPriceInput } from "@/lib/format";
import ProductForm, { type ProductFormValues } from "./product-form";
import { Panel } from "./admin-ui";
import { ProductThumb } from "./product-thumb";

type LookupFailure = Extract<BarcodeLookupResult, { ok: false }>;

// Valeurs du formulaire produit pour une proposition ; le stock initial reste à saisir
function proposalValues(proposal: ProductProposal): ProductFormValues {
  return {
    name: proposal.name,
    brand: proposal.brand,
    price: toPriceInput(proposal.price),
    regularPrice: "",
    netContent: proposal.netContent ?? "",
    description: proposal.description,
    nutriScore: proposal.nutriScore,
    categories: proposal.categories,
    hidden: proposal.hidden,
    stock: "",
  };
}

// Création d'un produit : recherche du code-barres sur Open Food Facts, puis formulaire produit
// pré-rempli, que l'administrateur corrige avant de créer la fiche
export default function NewProductForm({ categoryNames, brandNames }: { categoryNames: string[]; brandNames: string[] }) {
  const [barcode, setBarcode] = useState("");
  const [proposal, setProposal] = useState<ProductProposal | null>(null);
  const [failure, setFailure] = useState<LookupFailure | null>(null);
  const [isPending, startTransition] = useTransition();
  const initial = useMemo(() => (proposal ? proposalValues(proposal) : null), [proposal]);

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    setProposal(null);
    startTransition(async () => {
      const result = await lookupProductBarcode(barcode).catch(
        (): LookupFailure => ({ ok: false, error: "La recherche a échoué. Réessayez." })
      );
      if (result.ok) setProposal(result.proposal);
      else setFailure(result);
    });
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Code-barres"
        description="Le code imprimé sous les barres (EAN-13, EAN-8…), de 1 à 14 chiffres. Une douchette peut aussi le saisir."
      >
        <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
          <label className="flex h-11 w-full items-center gap-2 rounded-full border bg-white px-4 transition-colors focus-within:border-primary sm:max-w-sm">
            <ScanBarcode size={18} className="shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">Code-barres</span>
            <input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value.replace(/\D/g, "").slice(0, 14))}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="Par exemple 3017620422003"
              className="h-full min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={!barcode || isPending}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Search size={16} aria-hidden />}
            Rechercher
          </button>
        </form>

        {failure && (
          <p role="alert" className="mt-4 rounded-2xl bg-promo/10 px-4 py-3 text-sm font-semibold text-promo">
            {failure.error}
            {failure.existing && (
              <Link href={`/admin/products/${failure.existing.id}`} className="ml-2 underline hover:no-underline">
                Ouvrir sa fiche
              </Link>
            )}
          </p>
        )}
      </Panel>

      {proposal && initial && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <ProductForm
            key={proposal.barCode}
            target={{ barCode: proposal.barCode, picture: proposal.picture }}
            initial={initial}
            categoryNames={categoryNames}
            brandNames={brandNames}
          />

          <aside className="space-y-6 xl:sticky xl:top-8">
            <Panel title="Proposition Open Food Facts" description={`Code-barres ${proposal.barCode}`}>
              <div className="flex justify-center rounded-2xl bg-white">
                <ProductThumb src={proposal.picture} alt={proposal.name} size="lg" />
              </div>
              {!proposal.picture && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Pas de photo sur Open Food Facts : le produit est proposé masqué du catalogue.
                </p>
              )}
              {proposal.brand && (
                <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-primary">{formatBrand(proposal.brand)}</p>
              )}
              <p className="font-extrabold leading-snug">{proposal.name || "Produit sans nom"}</p>
              {proposal.netContent && <p className="text-sm text-muted-foreground">{proposal.netContent}</p>}
              <p className="mt-3 text-sm">
                Prix suggéré : <span className="font-black">{formatPrice(proposal.price)}</span>
              </p>
              <p className="text-xs text-muted-foreground">Calculé d’après le rayon, la contenance et la marque, comme le reste du catalogue.</p>
              <a
                href={`https://fr.openfoodfacts.org/produit/${proposal.barCode}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-bold transition-colors hover:border-primary hover:text-primary"
              >
                <ExternalLink size={16} aria-hidden /> Fiche Open Food Facts
              </a>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}
