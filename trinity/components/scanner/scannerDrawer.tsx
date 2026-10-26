"use client";

import { ComponentProps, useCallback, useState } from "react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
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
import { Skeleton } from "../ui/skeleton";
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [data, setData] = useState<ScannedProduct | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const scan = useCallback(async (scannedCode: string) => {
    setIsLoaded(true);
    setErrorMessage("");

    try {
      // Redirige vers la fiche si le produit est au catalogue
      const product = await findScannedProduct(scannedCode);
      if (product) {
        setData(toScannedProduct(product));
      } else {
        setData(null);
        setErrorMessage("Produit non trouvé dans la base de données ni sur Open Food Facts.");
      }
    } catch (error) {
      setErrorMessage("Erreur lors de la récupération des données.");
      console.error(error);
    }

    setIsLoaded(false);
  }, []);

  const handleBarCodeUpdate = useCallback<ScanHandler>(
    (_error, result) => {
      if (result) void scan(result.getText());
    },
    [scan]
  );

  const title = data ? data.name : "Scanner votre produit";
  const description = data ? (
    <span className="text-red-500">Produit pas en stock</span>
  ) : (
    "Passez le code barre devant la caméra."
  );

  return (
    <ResponsiveDialog>
      <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          {!data && !isLoaded && (
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg shadow-lg relative">
              <div className="relative border-4 border-teal-500 rounded-lg overflow-hidden shadow-lg">
                <BarcodeScannerComponent width={500} height={400} onUpdate={handleBarCodeUpdate} />
                <div className="absolute inset-0 border-4 border-dashed border-teal-400 rounded-lg pointer-events-none animate-pulse"></div>
              </div>

              <p className="text-sm text-gray-500 p-2">
                Placez le code-barres dans la zone pour le scanner automatiquement.
              </p>
            </div>
          )}
          {isLoaded && <Skeleton className="w-full h-10" />}
          {errorMessage && <div className="text-red-500 text-center my-4">{errorMessage}</div>}
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
              <Button variant="secondary" onClick={() => setData(null)}>
                Retour
              </Button>
            </ResponsiveDialogFooter>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
