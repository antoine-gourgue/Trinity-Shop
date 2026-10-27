"use client";

import { ComponentProps, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { Loader2, ScanBarcode } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsiveDialog";
import { findScannedProduct } from "@/lib/server-actions/scann-product-actions";
import type { OpenFoodFactsProduct } from "@/lib/open-food-facts";
import { nutritionRows } from "@/lib/product-info";
import Image from "next/image";
import { FaShoppingBag } from "react-icons/fa";
import { Button } from "../ui/button";
import Accordion from "@/components/ui/Accordion";

interface Props {
  children?: React.ReactNode;
}

type ScanHandler = ComponentProps<typeof BarcodeScannerComponent>["onUpdate"];

// Fiche affichée pour un produit que le drive ne vend pas (les produits du catalogue ouvrent leur page)
interface ScannedProduct {
  name: string;
  picture: string;
  // Note A à E, ou null si Open Food Facts n'en donne pas (pas d'image pour « unknown »)
  nutriScore: string | null;
  genericName: string;
  ingredients: string;
  origins: string;
  nutrition: string;
  conservation: string;
  manufacturingPlaces: string;
  brands: string;
}

function toScannedProduct(product: OpenFoodFactsProduct): ScannedProduct {
  const nutrition = [
    product.quantity ? `Quantité : ${product.quantity}` : null,
    ...nutritionRows(product.nutriments).map((row) => `${row.label} : ${row.value}`),
  ];

  return {
    name: product.product_name_fr || product.product_name || "Produit inconnu",
    picture: product.image_front_url || "/default-product.png",
    nutriScore: /^[a-e]$/i.test(product.nutriscore_grade ?? "") ? (product.nutriscore_grade ?? "").toUpperCase() : null,
    genericName: product.generic_name || "Aucune description disponible.",
    ingredients: product.ingredients_text_fr || "Ingrédients non disponibles.",
    origins: product.origins || "Origine non renseignée.",
    nutrition: nutrition.filter(Boolean).join(", "),
    conservation: product.conservation_conditions || "Aucune information sur la conservation.",
    manufacturingPlaces: product.manufacturing_places || "Lieu de fabrication non disponible.",
    brands: product.brands || "Marque non renseignée.",
  };
}

export default function ScannerDrawer({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  // Fiche du produit trouvé, en cours d'ouverture : le chargement reste affiché jusqu'à son arrivée
  const [opening, setOpening] = useState<string | null>(null);
  const [, startNavigation] = useTransition();
  const [data, setData] = useState<ScannedProduct | null>(null);
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
            setData(toScannedProduct(result.product));
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

  const title = data ? data.name : "Scanner votre produit";
  const description = data ? (
    <span className="text-red-500">Produit pas en stock</span>
  ) : (
    "Passez le code barre devant la caméra."
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={changeOpen}>
      <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          {!data && !searching && !opening && !errorMessage && (
            <div className="flex flex-col items-center gap-3 px-4 pb-4">
              <div className="relative w-full overflow-hidden rounded-2xl bg-black">
                <BarcodeScannerComponent width="100%" height={320} onUpdate={handleBarCodeUpdate} onError={handleCameraError} />
                {/* Zone de visée */}
                <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-white/80" />
              </div>
              <p className="text-center text-sm text-muted-foreground">Placez le code-barres dans le cadre : il est lu automatiquement.</p>
            </div>
          )}
          {(searching || opening) && (
            <p role="status" className="mx-4 mb-4 flex items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-6 text-sm font-semibold text-primary">
              <Loader2 size={18} className="animate-spin" aria-hidden />
              {opening ? "Ouverture de la fiche produit…" : "Recherche du produit…"}
            </p>
          )}
          {errorMessage && (
            <div className="mx-4 mb-4 flex flex-col items-center gap-3 rounded-2xl bg-muted px-4 py-6 text-center">
              <p className="text-sm font-semibold text-foreground">{errorMessage}</p>
              <button
                type="button"
                onClick={reset}
                className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
              >
                <ScanBarcode size={16} aria-hidden /> Scanner un autre produit
              </button>
            </div>
          )}
          {data && (
            <div className="flex flex-col md:flex-row p-4">
              <div className="flex-1 flex justify-center">
                <Image
                  src={data.picture}
                  alt={data.name}
                  width={350}
                  height={350}
                  className="object-contain w-auto h-96"
                />
              </div>

              <div className="flex-1 ml-4">
                <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>

                {data.nutriScore && (
                  <div className="mt-2">
                    <Image
                      src={`/assets/nutri-score-${data.nutriScore}.png`}
                      alt={`NutriScore ${data.nutriScore}`}
                      width={100}
                      height={40}
                    />
                  </div>
                )}

                <div className="w-64 bg-gray-100 p-6 rounded-lg flex flex-col items-center mt-4">
                  <span className="text-3xl font-bold text-gray-900 underline decoration-yellow-400">N/A</span>

                  <button
                    className="mt-4 bg-gray-400 text-white py-3 rounded-full flex items-center justify-center gap-2 w-full h-12 cursor-not-allowed"
                    disabled
                  >
                    <FaShoppingBag size={20} />
                    <span className="text-md font-semibold">Produit pas en stock</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {data && (
            <div className="mt-8">
              <Accordion title="Description">
                <div>
                  <h3 className="font-semibold">Informations complémentaires</h3>
                  <p className="text-gray-700 mt-2">{data.genericName}</p>
                </div>
              </Accordion>

              <Accordion title="Composition et origine">
                <div>
                  <h3 className="font-semibold">Ingrédients</h3>
                  <p className="text-gray-700 mt-2">{data.ingredients}</p>

                  <h3 className="font-semibold mt-4">Informations nutritionnelles</h3>
                  <div className="flex items-center mt-2">
                    {data.nutriScore && (
                      <Image
                        src={`/assets/nutri-score-${data.nutriScore}.png`}
                        alt={`NutriScore ${data.nutriScore}`}
                        width={100}
                        height={40}
                      />
                    )}
                    <p className="text-gray-700 ml-2">
                      Le Nutri-score est un logo qui informe sur la qualité nutritionnelle d&apos;un produit.
                    </p>
                  </div>

                  <h3 className="font-semibold mt-4">Origine</h3>
                  <p className="text-gray-700 mt-2">{data.origins}</p>

                  <h3 className="font-semibold mt-4">Valeurs nutritionnelles</h3>
                  <p className="text-gray-700 mt-2">{data.nutrition}</p>
                </div>
              </Accordion>

              <Accordion title="Conseils">
                <div>
                  <h3 className="font-semibold">Instruction de conservation</h3>
                  <p className="text-gray-700 mt-2">{data.conservation}</p>

                  <h3 className="font-semibold mt-4">Contact exploitant / Service consommateur</h3>
                  <p className="text-gray-700 mt-2">{data.manufacturingPlaces}</p>
                  <p className="text-gray-700 mt-2">{data.brands}</p>
                </div>
              </Accordion>
            </div>
          )}
          {data && (
            <ResponsiveDialogFooter>
              <Button variant="secondary" onClick={reset}>
                Scanner un autre produit
              </Button>
            </ResponsiveDialogFooter>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
