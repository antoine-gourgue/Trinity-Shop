"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
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
import { ScanQrCode, Minus, Plus } from "lucide-react";
import {
  getProductRepository,
  getOpenFoodFacts,
} from "@/lib/server-actions/scann-product-actions";
import { Skeleton } from "../ui/skeleton";
import Image from "next/image";
import { FaShoppingBag, FaStar } from "react-icons/fa";
import { Button } from "../ui/button";
import { useCart } from "@/app/contexts/CartContext";
import { useSession } from "next-auth/react";
import Accordion from "@/components/ui/Accordion";

interface Props {
  children?: React.ReactNode;
}

export default function ScannerDrawer({ children }: Props) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isFromOpenFoodFacts, setIsFromOpenFoodFacts] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [rating, setRating] = useState(0);
  const { data: session } = useSession();
  const { addProductToCart, removeProduct, updateProductQuantity } = useCart();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setRating(Math.floor(Math.random() * 5) + 1);
  }, []);

  const handleBarCodeUpdate = useCallback(async (err: any, result: any) => {
    if (!result) return;

    setIsLoaded(true);
    setErrorMessage("");
    const scannedCode = result.getText();

    try {
      const productData = await getProductRepository(scannedCode);
      const isInDB = productData && productData.price !== undefined;

      const openFoodData = await getOpenFoodFacts(scannedCode);

      if (openFoodData?.status === 1) {
        const productInfo = openFoodData.product;

        setData({
          id: productInfo.code,
          name:
            productInfo.product_name_fr ||
            productInfo.product_name ||
            "Produit inconnu",
          picture: productInfo.image_front_url || "/default-product.png",
          price: isInDB ? productData.price : 0,
          nutriScore: productInfo.nutriscore_grade || "unknown",
          generic_name:
            productInfo.generic_name || "Aucune description disponible.",
          quantity: productInfo.quantity || "Non spécifié",
          ingredients_text: productInfo.ingredients_text_fr || "Non spécifié",
          origins: productInfo.origins || "Origine non renseignée",
          conservation_conditions:
            productInfo.conservation_conditions || "Non renseigné",
          manufacturing_places:
            productInfo.manufacturing_places || "Non spécifié",
          brands: productInfo.brands || "Non spécifié",
          nutriments: productInfo.nutriments || {},
        });

        setIsFromOpenFoodFacts(!isInDB);
      } else {
        setData(null);
        setErrorMessage(
          "Produit non trouvé dans la base de données ni sur Open Food Facts."
        );
      }
    } catch (error) {
      setErrorMessage("Erreur lors de la récupération des données.");
      console.error(error);
    }

    setIsLoaded(false);
  }, []);

  const title = useMemo(
    () => (!data ? "Scanner votre produit" : data.name || "Produit inconnu"),
    [data]
  );

  const description = useMemo(() => {
    if (!data) return "Passez le code barre devant la caméra.";
    return isFromOpenFoodFacts ? (
      <span className="text-red-500">Produit pas en stock</span>
    ) : (
      <span className="text-green-600">Produit en stock</span>
    );
  }, [data, isFromOpenFoodFacts]);

  const handleAddToCart = () => {
    if (!session) return;
    addProductToCart(data.id, 1);
    setQuantity(1);
  };

  const handleIncreaseQuantity = () => {
    updateProductQuantity(data.id, quantity + 1);
    setQuantity(quantity + 1);
  };

  const handleDecreaseQuantity = () => {
    if (quantity <= 1) {
      removeProduct(data.id);
      setQuantity(0);
    } else {
      updateProductQuantity(data.id, quantity - 1);
      setQuantity(quantity - 1);
    }
  };

  return (
    <ResponsiveDialog>
      <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          {" "}
          {/* Scrollable content */}
          {!data && !isLoaded && (
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg shadow-lg relative">
              <div className="relative border-4 border-teal-500 rounded-lg overflow-hidden shadow-lg">
                <BarcodeScannerComponent
                  width={500}
                  height={400}
                  onUpdate={handleBarCodeUpdate}
                />
                <div className="absolute inset-0 border-4 border-dashed border-teal-400 rounded-lg pointer-events-none animate-pulse"></div>
              </div>

              <p className="text-sm text-gray-500 p-2">
                Placez le code-barres dans la zone pour le scanner
                automatiquement.
              </p>
            </div>
          )}
          {isLoaded && <Skeleton className="w-full h-10" />}
          {errorMessage && (
            <div className="text-red-500 text-center my-4">{errorMessage}</div>
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
                <h1 className="text-2xl font-bold text-gray-900">
                  {data.name}
                </h1>

                {data.nutriScore && (
                  <div className="mt-2">
                    <Image
                      src={`/assets/nutri-score-${data.nutriScore.toUpperCase()}.png`}
                      alt={`NutriScore ${data.nutriScore}`}
                      width={100}
                      height={40}
                    />
                  </div>
                )}

                <div className="flex items-center mt-3">
                  {[...Array(5)].map((_, index) => (
                    <FaStar
                      key={index}
                      className={`text-yellow-400 ${index < rating ? "opacity-100" : "opacity-30"}`}
                    />
                  ))}
                </div>

                <div className="w-64 bg-gray-100 p-6 rounded-lg flex flex-col items-center mt-4">
                  <span className="text-3xl font-bold text-gray-900 underline decoration-yellow-400">
                    {isFromOpenFoodFacts
                      ? "N/A"
                      : `${(data.price / 1000).toFixed(2)} €`}
                  </span>

                  {isFromOpenFoodFacts ? (
                    <button
                      className="mt-4 bg-gray-400 text-white py-3 rounded-full flex items-center justify-center gap-2 w-full h-12 cursor-not-allowed"
                      disabled
                    >
                      <FaShoppingBag size={20} />
                      <span className="text-md font-semibold">
                        Produit pas en stock
                      </span>
                    </button>
                  ) : quantity === 0 ? (
                    <button
                      className="mt-4 bg-teal-600 text-white py-3 rounded-full flex items-center justify-center gap-2 hover:bg-teal-700 transition w-full h-12"
                      onClick={handleAddToCart}
                    >
                      <FaShoppingBag size={20} />
                      <span className="text-md font-semibold">
                        Ajouter à mon panier
                      </span>
                    </button>
                  ) : (
                    <div className="mt-4 bg-teal-600 text-white px-6 py-3 rounded-full flex items-center justify-between w-full h-12">
                      <button
                        onClick={handleDecreaseQuantity}
                        className="rounded-full p-1"
                      >
                        <Minus size={20} />
                      </button>
                      <span className="font-semibold">{quantity}</span>
                      <button
                        onClick={handleIncreaseQuantity}
                        className="rounded-full p-1"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {data && (
            <div className="mt-8">
              <Accordion title="Description">
                <div>
                  <h3 className="font-semibold">
                    Informations complémentaires
                  </h3>
                  <p className="text-gray-700 mt-2">
                    {data?.generic_name || "Aucune description disponible."}
                  </p>
                </div>
              </Accordion>

              <Accordion title="Composition et origine">
                <div>
                  <h3 className="font-semibold">Ingrédients</h3>
                  <p className="text-gray-700 mt-2">
                    {data?.ingredients_text || "Ingrédients non disponibles."}
                  </p>

                  <h3 className="font-semibold mt-4">
                    Informations nutritionnelles
                  </h3>
                  <div className="flex items-center mt-2">
                    <Image
                      src={`/assets/nutri-score-${data.nutriScore?.toUpperCase()}.png`}
                      alt={`NutriScore ${data.nutriScore}`}
                      width={100}
                      height={40}
                    />
                    <p className="text-gray-700 ml-2">
                      Le Nutri-score est un logo qui informe sur la qualité
                      nutritionnelle d'un produit.
                    </p>
                  </div>

                  <h3 className="font-semibold mt-4">Origine</h3>
                  <p className="text-gray-700 mt-2">
                    {data?.origins || "Origine non renseignée."}
                  </p>

                  <h3 className="font-semibold mt-4">
                    Valeurs nutritionnelles
                  </h3>
                  <p className="text-gray-700 mt-2">
                    {[
                      data?.quantity ? `Quantité : ${data.quantity}` : null,
                      data?.nutriments?.energy_100g
                        ? `Énergie : ${data.nutriments.energy_100g} kJ`
                        : null,
                      data?.nutriments?.["energy-kcal_100g"]
                        ? `${data.nutriments["energy-kcal_100g"]} kcal`
                        : null,
                      data?.nutriments?.fat_100g
                        ? `Matières grasses : ${data.nutriments.fat_100g} g`
                        : null,
                      data?.nutriments?.["saturated-fat_100g"]
                        ? `dont acides gras saturés ${data.nutriments["saturated-fat_100g"]} g`
                        : null,
                      data?.nutriments?.carbohydrates_100g
                        ? `Glucides : ${data.nutriments.carbohydrates_100g} g`
                        : null,
                      data?.nutriments?.sugars_100g
                        ? `dont sucres ${data.nutriments.sugars_100g} g`
                        : null,
                      data?.nutriments?.fiber_100g
                        ? `Fibres alimentaires : ${data.nutriments.fiber_100g} g`
                        : null,
                      data?.nutriments?.proteins_100g
                        ? `Protéines : ${data.nutriments.proteins_100g} g`
                        : null,
                      data?.nutriments?.salt_100g
                        ? `Sel : ${data.nutriments.salt_100g} g`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </Accordion>

              <Accordion title="Conseils">
                <div>
                  <h3 className="font-semibold">Instruction de conservation</h3>
                  <p className="text-gray-700 mt-2">
                    {data?.conservation_conditions ||
                      "Aucune information sur la conservation."}
                  </p>

                  <h3 className="font-semibold mt-4">
                    Contact exploitant / Service consommateur
                  </h3>
                  <p className="text-gray-700 mt-2">
                    {data?.manufacturing_places ||
                      "Lieu de fabrication non disponible."}
                  </p>
                  <p className="text-gray-700 mt-2">
                    {data?.brands || "Marque non renseignée."}
                  </p>
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
