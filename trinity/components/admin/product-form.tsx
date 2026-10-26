"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Search, X } from "lucide-react";
import { saveProduct, type ProductInput } from "@/lib/server-actions/admin-actions";
import { toast } from "@/hooks/use-toast";
import { formatBrand } from "@/lib/format";
import { cn } from "@/lib/utils";

const GRADES = ["A", "B", "C", "D", "E"] as const;
const GRADE_COLORS: Record<string, string> = {
  A: "bg-[#038141]",
  B: "bg-[#85BB2F]",
  C: "bg-[#FECB02] text-brand-dark",
  D: "bg-[#EE8100]",
  E: "bg-[#E63E11]",
};

export interface ProductFormValues {
  name: string;
  brand: string;
  price: string;
  regularPrice: string;
  netContent: string;
  description: string;
  nutriScore: string | null;
  categories: string[];
  hidden: boolean;
  stock: string;
}

// Saisie en euros avec virgule ou point (« 2,39 »)
const parseEuros = (value: string) => Number.parseFloat(value.replace(",", ".").replace(/\s/g, ""));

const INPUT =
  "h-11 w-full rounded-2xl border bg-white px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function ProductForm({
  productId,
  initial,
  categoryNames,
  brandNames,
}: {
  productId: string;
  initial: ProductFormValues;
  categoryNames: string[];
  brandNames: string[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const suggestions = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (term.length < 2) return [];
    return categoryNames.filter((name) => name.toLowerCase().includes(term) && !values.categories.includes(name)).slice(0, 8);
  }, [categorySearch, categoryNames, values.categories]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const input: ProductInput = {
      name: values.name,
      brand: values.brand,
      price: parseEuros(values.price),
      regularPrice: values.regularPrice.trim() ? parseEuros(values.regularPrice) : null,
      netContent: values.netContent.trim() || null,
      description: values.description,
      nutriScore: (values.nutriScore as ProductInput["nutriScore"]) ?? null,
      categories: values.categories,
      hidden: values.hidden,
      stock: Number(values.stock),
    };
    if (!Number.isFinite(input.price) || (input.regularPrice !== null && !Number.isFinite(input.regularPrice))) {
      setError("Saisissez les prix en euros, par exemple 2,39.");
      return;
    }
    startTransition(async () => {
      const result = await saveProduct(productId, input).catch(() => ({ ok: false as const, error: "L'enregistrement a échoué. Réessayez." }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast({ description: "Produit enregistré." });
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-3xl border bg-white p-5 md:p-6">
        <h2 className="mb-4 font-extrabold">Informations</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Nom du produit" htmlFor="name">
              <input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} className={INPUT} required />
            </Field>
          </div>
          <Field
            label="Marque"
            htmlFor="brand"
            hint={`Affichée « ${formatBrand(values.brand)} » sur la boutique. Choisissez une marque existante ou saisissez-en une nouvelle.`}
          >
            <input id="brand" list="brand-names" value={values.brand} onChange={(e) => set("brand", e.target.value)} className={INPUT} required />
            <datalist id="brand-names">
              {brandNames.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </Field>
          <Field label="Contenance" htmlFor="netContent" hint="Telle qu'affichée en rayon, par exemple « 500 g » ou « 6 x 1 L ».">
            <input id="netContent" value={values.netContent} onChange={(e) => set("netContent", e.target.value)} className={INPUT} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description" htmlFor="description">
              <textarea
                id="description"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className={cn(INPUT, "h-auto py-3 leading-relaxed")}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5 md:p-6">
        <h2 className="mb-4 font-extrabold">Prix et stock</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Prix de vente (€)" htmlFor="price">
            <input id="price" inputMode="decimal" value={values.price} onChange={(e) => set("price", e.target.value)} className={INPUT} required />
          </Field>
          <Field label="Prix barré (€)" htmlFor="regularPrice" hint="Laissez vide si le produit n'est pas en promotion.">
            <input
              id="regularPrice"
              inputMode="decimal"
              value={values.regularPrice}
              onChange={(e) => set("regularPrice", e.target.value)}
              placeholder="Pas de promotion"
              className={INPUT}
            />
          </Field>
          <Field label="Stock (unités)" htmlFor="stock">
            <input
              id="stock"
              type="number"
              min={0}
              step={1}
              value={values.stock}
              onChange={(e) => set("stock", e.target.value)}
              className={INPUT}
              required
            />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5 md:p-6">
        <h2 className="font-extrabold">Nutri-Score</h2>
        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Nutri-Score">
          {GRADES.map((grade) => {
            const selected = values.nutriScore === grade;
            return (
              <button
                key={grade}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set("nutriScore", grade)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black text-white transition-all",
                  GRADE_COLORS[grade],
                  selected ? "scale-110 ring-4 ring-primary/30" : "opacity-40 hover:opacity-80"
                )}
              >
                {grade}
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={values.nutriScore === null || values.nutriScore === "unknown"}
            onClick={() => set("nutriScore", null)}
            className={cn(
              "h-11 rounded-2xl border px-4 text-sm font-bold transition-colors",
              values.nutriScore === null || values.nutriScore === "unknown" ? "border-primary bg-secondary text-primary" : "bg-white hover:border-primary"
            )}
          >
            Non renseigné
          </button>
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5 md:p-6">
        <h2 className="font-extrabold">Catégories</h2>
        <p className="mt-1 text-xs text-muted-foreground">Elles déterminent les rayons et sous-rayons où le produit apparaît.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {values.categories.map((category) => (
            <li key={category} className="flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-sm font-semibold text-primary">
              {category}
              <button
                type="button"
                onClick={() => set("categories", values.categories.filter((c) => c !== category))}
                aria-label={`Retirer ${category}`}
                className="rounded-full p-1 hover:bg-primary hover:text-white"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
          {values.categories.length === 0 && <li className="text-sm text-muted-foreground">Aucune catégorie.</li>}
        </ul>
        <div className="relative mt-4 max-w-md">
          <label className="flex h-11 items-center gap-2 rounded-2xl border bg-white px-4 focus-within:border-primary">
            <Search size={16} className="text-muted-foreground" aria-hidden />
            <span className="sr-only">Ajouter une catégorie</span>
            <input
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Ajouter une catégorie…"
              className="h-full flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          {suggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-12 z-10 overflow-hidden rounded-2xl border bg-white shadow-lg">
              {suggestions.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => {
                      set("categories", [...values.categories, name]);
                      setCategorySearch("");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary"
                  >
                    <Plus size={14} className="text-primary" aria-hidden /> {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="flex items-center justify-between gap-4 rounded-3xl border bg-white p-5 md:p-6">
        <div>
          <h2 className="font-extrabold">Visible sur la boutique</h2>
          <p className="text-xs text-muted-foreground">Un produit masqué n’apparaît plus dans les rayons ni dans la recherche.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!values.hidden}
          aria-label="Visible sur la boutique"
          onClick={() => set("hidden", !values.hidden)}
          className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", values.hidden ? "bg-muted-foreground/30" : "bg-bio")}
        >
          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", values.hidden ? "left-1" : "left-6")} />
        </button>
      </section>

      {error && <p className="rounded-2xl bg-promo/10 px-4 py-3 text-sm font-semibold text-promo">{error}</p>}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-3xl border bg-white/95 p-3 shadow-lg backdrop-blur">
        {dirty && <p className="mr-auto pl-2 text-sm font-semibold text-muted-foreground">Modifications non enregistrées</p>}
        <button
          type="button"
          onClick={() => setValues(initial)}
          disabled={!dirty || isPending}
          className="h-11 rounded-full border px-5 text-sm font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          Annuler les modifications
        </button>
        <button
          type="submit"
          disabled={!dirty || isPending}
          className="flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
          Enregistrer
        </button>
      </div>
    </form>
  );
}
