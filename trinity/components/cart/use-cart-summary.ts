"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/app/contexts/CartContext";
import { CartItemDetails, CartSuggestion, getCartDetails } from "@/lib/server-actions/cart-details-actions";
import { useStoreChoice } from "@/components/store/store-provider";

// Panier enrichi (marque, contenance, prix barré, rayon) et totaux, partagés par les étapes de commande
export function useCartSummary() {
  const { cartProducts } = useCart();
  // Stock du magasin choisi : les détails sont relus quand le client change de magasin
  const storeSlug = useStoreChoice().store?.slug;
  const [details, setDetails] = useState<Record<string, CartItemDetails>>({});
  const [suggestions, setSuggestions] = useState<CartSuggestion[]>([]);

  const productIdsKey = cartProducts.map((p) => p.id).sort().join(",");

  // Rechargé quand la liste des produits ou le magasin change, pas à chaque quantité
  useEffect(() => {
    if (!productIdsKey) return;
    getCartDetails(productIdsKey.split(",")).then(({ details, suggestions }) => {
      setDetails(details);
      setSuggestions(suggestions);
    });
  }, [productIdsKey, storeSlug]);

  const totalItems = cartProducts.reduce((acc, product) => acc + product.quantity, 0);
  const totalPrice = cartProducts.reduce((acc, product) => acc + product.price * product.quantity, 0);
  const savings = cartProducts.reduce((acc, product) => {
    const regular = details[product.id]?.regularPrice;
    return regular && regular > product.price ? acc + (regular - product.price) * product.quantity : acc;
  }, 0);

  return { cartProducts, details, suggestions, totalItems, totalPrice, savings };
}
