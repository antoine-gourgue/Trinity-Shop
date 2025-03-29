"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { FaShoppingBag, FaStar } from "react-icons/fa";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCart } from "@/app/contexts/CartContext";
import LoginModal from "@/components/modal/LoginModal";
import { getProductById, getOpenFoodFacts } from "@/lib/server-actions/products-actions";
import Accordion from "@/components/ui/Accordion";

export default function ProductPage() {
  const { data: session } = useSession();
  const { productId } = useParams();
  const router = useRouter();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [product, setProduct] = useState<any>(null);
  const [openFoodData, setOpenFoodData] = useState<any>(null);
  const [quantity, setQuantity] = useState(0);
  const [rating, setRating] = useState<number>(0);
  const { cartProducts, addProductToCart, removeProduct, updateProductQuantity } = useCart();

  useEffect(() => {
    if (!productId) return;

    const fetchProductData = async () => {
      const { product, error } = await getProductById(productId as string);
      if (error || !product) {
        return;
      }
      setProduct(product);

      if (product?.barCode) {
        const barCode = typeof product.barCode === "bigint" ? product.barCode.toString() : product.barCode;
        const { openFoodData } = await getOpenFoodFacts(barCode);
        setOpenFoodData(openFoodData);
      }
    };

    fetchProductData();
  }, [productId, router]);

  useEffect(() => {
    setRating(Math.floor(Math.random() * 5) + 1);
  }, []);

  useEffect(() => {
    if (product) {
      const existingProduct = cartProducts.find((p) => p.id === product.id);
      if (existingProduct) {
        setQuantity(existingProduct.quantity);
      }
    }
  }, [cartProducts, product]);

  if (!product) {
    return <p>Chargement du produit...</p>;
  }

  const priceInEuros = (product.price / 1000).toFixed(2);

  const handleAddToCart = () => {
    if (!session) {
      setIsLoginModalOpen(true);
      return;
    }

    startTransition(async () => {
      await addProductToCart(product.id, 1);
      setQuantity(1);
    });
  };

  const handleIncreaseQuantity = () => {
    startTransition(async () => {
      await updateProductQuantity(product.id, quantity + 1);
      setQuantity(quantity + 1);
    });
  };

  const handleDecreaseQuantity = () => {
    if (quantity <= 1) {
      startTransition(async () => {
        await removeProduct(product.id);
        setQuantity(0);
      });
    } else {
      startTransition(async () => {
        await updateProductQuantity(product.id, quantity - 1);
        setQuantity(quantity - 1);
      });
    }
  };

  return (
      <div className="w-full px-2 md:px-12 py-4">
        <nav className="text-gray-500 text-sm mb-6">
          <span className="text-gray-600 cursor-pointer hover:underline">Accueil</span> &gt;
          <Link href={`/category/${product.categories[0].category.id}`} className="ml-1 cursor-pointer hover:underline">
            {product.categories[0].category.name} &gt;
          </Link>
          <span className="ml-1 font-semibold text-gray-900">{product.name}</span>
        </nav>

        <div className="bg-white shadow-md rounded-lg p-6 flex flex-col md:flex-row items-start">
          <div className="flex-1 flex justify-center">
            <Image
                src={product.picture}
                alt={product.name}
                width={350}
                height={350}
                className="object-contain w-auto h-96"
            />
          </div>

          <div className="flex-1 ml-4">
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

            {product.nutriScore && (
                <div className="mt-2">
                  <Image
                      src={`/assets/nutri-score-${product.nutriScore.toUpperCase()}.png`}
                      alt={`NutriScore ${product.nutriScore}`}
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

            <div className="mt-3">
              <button className="bg-gray-200 px-4 py-1 text-sm rounded-md text-gray-700">Produit frais</button>
            </div>
          </div>

          <div className="w-64 bg-gray-100 p-6 rounded-lg flex flex-col items-center ml-4">
            <span className="text-3xl font-bold text-gray-900 underline decoration-yellow-400">{priceInEuros} €</span>

            {quantity === 0 ? (
                <button
                    className="mt-4 bg-teal-600 text-white py-3 rounded-full flex items-center justify-center gap-2 hover:bg-teal-700 transition w-full h-12"
                    onClick={handleAddToCart}
                    disabled={isPending}
                >
                  <FaShoppingBag size={20} />
                  <span className="text-md font-semibold">Ajouter à mon panier</span>
                </button>
            ) : (
                <div className="mt-4 bg-teal-600 text-white px-6 py-3 rounded-full flex items-center justify-between w-full h-12">
                  <button onClick={handleDecreaseQuantity} className="rounded-full p-1">
                    <Minus size={20} />
                  </button>
                  <span className="font-semibold">{quantity}</span>
                  <button onClick={handleIncreaseQuantity} className="rounded-full p-1">
                    <Plus size={20} />
                  </button>
                </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Accordion title="Description">
            <div>
              <h3 className="font-semibold">Informations complémentaires</h3>
              <p className="text-gray-700 mt-2">{openFoodData?.generic_name || "Aucune description disponible."}</p>
            </div>
          </Accordion>

          <Accordion title="Composition et origine">
            <div>
              <h3 className="font-semibold">Ingrédients</h3>
              <p className="text-gray-700 mt-2">
                {openFoodData?.ingredients_text || "Ingrédients non disponibles."}
              </p>

              <h3 className="font-semibold mt-4">Informations nutritionnelles</h3>
              <div className="flex items-center mt-2">
                <Image
                    src={`/assets/nutri-score-${product.nutriScore?.toUpperCase()}.png`}
                    alt={`NutriScore ${product.nutriScore}`}
                    width={100}
                    height={40}
                />
                <p className="text-gray-700 ml-2">Le Nutri-score est un logo qui informe sur la qualité nutritionnelle d'un produit.</p>
              </div>

              <h3 className="font-semibold mt-4">Origine</h3>
              <p className="text-gray-700 mt-2">
                {openFoodData?.origins || "Origine non renseignée."}
              </p>

              <h3 className="font-semibold mt-4">Valeurs nutritionnelles</h3>
              <p className="text-gray-700 mt-2">
                {[
                  openFoodData?.quantity ? `Quantité : ${openFoodData.quantity}` : null,
                  openFoodData?.nutriments?.energy_100g ? `Énergie : ${openFoodData.nutriments.energy_100g} kJ` : null,
                  openFoodData?.nutriments?.["energy-kcal_100g"] ? `${openFoodData.nutriments["energy-kcal_100g"]} kcal` : null,
                  openFoodData?.nutriments?.fat_100g ? `Matières grasses : ${openFoodData.nutriments.fat_100g} g` : null,
                  openFoodData?.nutriments?.["saturated-fat_100g"] ? `dont acides gras saturés ${openFoodData.nutriments["saturated-fat_100g"]} g` : null,
                  openFoodData?.nutriments?.carbohydrates_100g ? `Glucides : ${openFoodData.nutriments.carbohydrates_100g} g` : null,
                  openFoodData?.nutriments?.sugars_100g ? `dont sucres ${openFoodData.nutriments.sugars_100g} g` : null,
                  openFoodData?.nutriments?.fiber_100g ? `Fibres alimentaires : ${openFoodData.nutriments.fiber_100g} g` : null,
                  openFoodData?.nutriments?.proteins_100g ? `Protéines : ${openFoodData.nutriments.proteins_100g} g` : null,
                  openFoodData?.nutriments?.salt_100g ? `Sel : ${openFoodData.nutriments.salt_100g} g` : null
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
                {openFoodData?.conservation_conditions || "Aucune information sur la conservation."}
              </p>

              <h3 className="font-semibold mt-4">Contact exploitant / Service consommateur</h3>
              <p className="text-gray-700 mt-2">{openFoodData?.manufacturing_places || "Lieu de fabrication non disponible."}</p>
              <p className="text-gray-700 mt-2">{openFoodData?.brands || "Marque non renseignée."}</p>
            </div>
          </Accordion>
        </div>

        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </div>
  );
}
