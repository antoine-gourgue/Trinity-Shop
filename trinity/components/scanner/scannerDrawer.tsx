"use client";

import { ComponentProps, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { ChevronDown, ChevronRight, Loader2, ScanBarcode } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsiveDialog";
import { findScannedProduct, type ScanResult } from "@/lib/server-actions/scann-product-actions";
import { formatBrand, formatPrice } from "@/lib/format";
import { ingredientParts } from "@/lib/product-info";
import { cn } from "@/lib/utils";
import ProductImage from "@/components/product/product-image";
import NutriScore from "@/components/product/nutri-score";
import NutritionTable from "@/components/product/nutrition-table";

interface Props {
  children?: React.ReactNode;
}

type ScanHandler = ComponentProps<typeof BarcodeScannerComponent>["onUpdate"];

// Produit que le drive ne vend pas (les produits du catalogue ouvrent leur page)
type ExternalScan = Extract<ScanResult, { kind: "external" }>;

export default function ScannerDrawer({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  // Fiche du produit trouvé, en cours d'ouverture : le chargement reste affiché jusqu'à son arrivée
  const [opening, setOpening] = useState<string | null>(null);
  const [, startNavigation] = useTransition();
  const [data, setData] = useState<ExternalScan | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // La caméra lit le même code plusieurs fois par seconde : une seule recherche à la fois
  const busy = useRef(false);

  const reset = useCallback(() => {
    busy.current = false;
    setSearching(false);
    setData(null);
    setErrorMessage("");
  }, []);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setOpening(null);
      reset();
    }
  };

  const scan = useCallback(
    async (scannedCode: string) => {
      if (busy.current) return;
      busy.current = true;
      setSearching(true);
      setErrorMessage("");
      try {
        const result = await findScannedProduct(scannedCode);
        switch (result.kind) {
          case "catalog": {
            // Produit du drive : sa fiche s'ouvre ; le scanner, avec son chargement, reste affiché
            // jusqu'à ce qu'elle soit à l'écran (voir l'effet plus bas)
            const href = `/product/${result.productId}`;
            setOpening(href);
            startNavigation(() => router.push(href));
            return;
          }
          case "external":
            setData(result);
            break;
          case "invalid":
            setErrorMessage("Ce code n'est pas un code-barres de produit. Visez le code-barres imprimé sur l'emballage.");
            break;
          default:
            setErrorMessage("Produit introuvable, ni dans notre catalogue ni sur Open Food Facts.");
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("La recherche n'a pas abouti. Vérifiez votre connexion et réessayez.");
      }
      // Résultat affiché : la caméra s'arrête jusqu'au prochain scan demandé
      setSearching(false);
    },
    [router]
  );

  // Fiche affichée : le scanner se ferme sur la nouvelle page
  useEffect(() => {
    if (!opening || pathname !== opening) return;
    setOpen(false);
    setOpening(null);
    reset();
  }, [opening, pathname, reset]);

  const handleBarCodeUpdate = useCallback<ScanHandler>(
    (_error, result) => {
      if (result) void scan(result.getText());
    },
    [scan]
  );

  // Caméra refusée ou absente : on l'explique au lieu d'afficher un cadre vide
  const handleCameraError = useCallback(() => {
    busy.current = true;
    setErrorMessage("Caméra indisponible : autorisez l'accès à la caméra dans votre navigateur, puis réessayez.");
  }, []);

  const title = data ? "Produit scanné" : "Scanner votre produit";
  const description = data ? `Code-barres ${data.product.barCode}` : "Passez le code barre devant la caméra.";

  return (
    <ResponsiveDialog open={open} onOpenChange={changeOpen}>
      <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="md:rounded-3xl">
        <ResponsiveDialogHeader className="text-left">
          <ResponsiveDialogTitle className="text-lg font-extrabold">{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          {!data && !searching && !opening && !errorMessage && (
            <div className="flex flex-col items-center gap-3 px-4 pb-4 md:px-0 md:pb-0">
              <div className="relative w-full overflow-hidden rounded-2xl bg-black">
                <BarcodeScannerComponent width="100%" height={320} onUpdate={handleBarCodeUpdate} onError={handleCameraError} />
                {/* Zone de visée */}
                <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-white/80" />
              </div>
              <p className="text-center text-sm text-muted-foreground">Placez le code-barres dans le cadre : il est lu automatiquement.</p>
            </div>
          )}
          {(searching || opening) && (
            <p role="status" className="mx-4 mb-4 flex items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-6 text-sm font-semibold text-primary md:mx-0 md:mb-0">
              <Loader2 size={18} className="animate-spin" aria-hidden />
              {opening ? "Ouverture de la fiche produit…" : "Recherche du produit…"}
            </p>
          )}
          {errorMessage && (
            <div className="mx-4 mb-4 flex flex-col items-center gap-3 rounded-2xl bg-muted px-4 py-6 text-center md:mx-0 md:mb-0">
              <p className="text-sm font-semibold text-foreground">{errorMessage}</p>
              <ScanAgainButton onClick={reset} />
            </div>
          )}
          {data && <ExternalProduct scan={data} onNavigate={() => changeOpen(false)} />}
        </div>
        {data && (
          <div className="border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-0 md:pb-0">
            <ScanAgainButton onClick={reset} className="w-full" />
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function ScanAgainButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark",
        className
      )}
    >
      <ScanBarcode size={16} aria-hidden /> Scanner un autre produit
    </button>
  );
}

// Fiche d'un produit que le drive ne vend pas, au style des fiches du catalogue, suivie des produits
// proches que le client peut acheter à la place
function ExternalProduct({ scan, onNavigate }: { scan: ExternalScan; onNavigate: () => void }) {
  const { product, similar, rayon } = scan;
  const composition = product.nonFood ? "Composition" : "Ingrédients";

  return (
    <div className="space-y-5 px-4 pb-4 md:px-0">
      <article className="flex gap-4 rounded-3xl border bg-white p-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border bg-white sm:h-32 sm:w-32">
          <ProductImage src={product.picture ?? ""} alt={product.name} sizes="128px" remote className="p-2" />
        </div>
        <div className="min-w-0 flex-1">
          {product.brand && (
            <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{formatBrand(product.brand)}</p>
          )}
          <h3 className="mt-0.5 text-lg font-black leading-tight">{product.name}</h3>
          {product.quantity && <p className="mt-0.5 text-sm text-muted-foreground">{product.quantity}</p>}
          <NutriScore grade={product.nutriScore} className="mt-3 h-9" />
          <p className="mt-3 flex items-center gap-2 text-sm font-bold">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-promo" />
            Pas vendu au drive
          </p>
        </div>
      </article>

      {similar.length > 0 && (
        <section aria-labelledby="scan-similar">
          <h3 id="scan-similar" className="text-sm font-extrabold uppercase tracking-wide text-brand-dark">
            À la place, chez Trinity
          </h3>
          <ul className="mt-2 divide-y rounded-2xl border bg-white">
            {similar.map((item) => {
              const promo = item.regularPrice !== null && item.regularPrice > item.price;
              return (
                <li key={item.id}>
                  <Link
                    href={`/product/${item.id}`}
                    onClick={onNavigate}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-muted"
                  >
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-white">
                      <ProductImage src={item.picture} alt="" sizes="48px" className="p-0.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatBrand(item.brand)}
                        {item.netContent && ` · ${item.netContent}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      {promo && item.regularPrice && (
                        <span className="text-[11px] text-muted-foreground line-through">
                          <span className="sr-only">Au lieu de </span>
                          {formatPrice(item.regularPrice)}
                        </span>
                      )}
                      <span className={cn("text-sm font-black tabular-nums", promo && "text-promo")}>{formatPrice(item.price)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {rayon && (
            <Link
              href={rayon.href}
              onClick={onNavigate}
              className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Voir le rayon {rayon.name} <ChevronRight size={16} aria-hidden />
            </Link>
          )}
        </section>
      )}

      <div className="divide-y rounded-2xl border bg-white">
        <ScanDetails title={product.allergens.length ? `${composition} et allergènes` : composition}>
          <p>
            {product.ingredients
              ? ingredientParts(product.ingredients).map((part, index) =>
                  part.allergen ? <strong key={index}>{part.text}</strong> : part.text
                )
              : product.nonFood
                ? "Composition non renseignée."
                : "Ingrédients non renseignés."}
          </p>
          {product.allergens.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-2">
              {product.allergens.map((allergen) => (
                <span key={allergen} className="rounded-full bg-promo/10 px-3 py-1 text-xs font-bold text-promo">
                  {allergen}
                </span>
              ))}
            </p>
          )}
        </ScanDetails>
        {(product.description || product.origins) && (
          <ScanDetails title="Description et origine">
            {product.description && <p>{product.description}</p>}
            {product.origins && (
              <p className={product.description ? "mt-2" : undefined}>
                <span className="font-bold">Origine :</span> {product.origins}
              </p>
            )}
          </ScanDetails>
        )}
      </div>

      {product.nutrition.length > 0 && (
        <section aria-labelledby="scan-nutrition">
          <h3 id="scan-nutrition" className="mb-2 text-sm font-extrabold uppercase tracking-wide text-brand-dark">
            Valeurs nutritionnelles
          </h3>
          <NutritionTable rows={product.nutrition} defaultOpen={false} />
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Informations issues d’{product.source}, données collaboratives sous licence ODbL.
      </p>
    </div>
  );
}

// Rubrique repliable, comme les groupes de filtres du catalogue
function ScanDetails({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-extrabold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown size={18} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-2 text-sm leading-relaxed text-foreground/80">{children}</div>
    </details>
  );
}
