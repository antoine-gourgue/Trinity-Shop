"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { getCartProducts, addToCart, removeProductFromCart, updateProductQuantityInCart } from "@/lib/server-actions/cart-actions";

type CartProduct = {
    id: string;
    name: string;
    price: number;
    picture: string;
    quantity: number;
};

type CartContextType = {
    cartProducts: CartProduct[];
    addProductToCart: (productId: string, quantity: number) => Promise<void>;
    removeProduct: (productId: string) => Promise<void>;
    updateProductQuantity: (productId: string, quantity: number) => Promise<void>;
    handleUpdateProductQuantity: (productId: string, quantity: number) => Promise<void>;
    refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);
    const [initialOrder, setInitialOrder] = useState<string[]>([]);

    const refreshCart = async () => {
        const response = await getCartProducts();
        if (!response.error) {
            let products = response.products || [];
            if (initialOrder.length === 0) {
                setInitialOrder(products.map((p) => p.id));
            } else {
                products.sort((a, b) => {
                    return initialOrder.indexOf(a.id) - initialOrder.indexOf(b.id);
                });
            }
            setCartProducts(products);
        }
    };

    useEffect(() => {
        refreshCart();
    }, []);

    const addProductToCart = async (productId: string, quantity: number) => {
        await addToCart(productId, quantity);
        await refreshCart();
    };

    const removeProduct = async (productId: string) => {
        await removeProductFromCart(productId);
        await refreshCart();
    };

    const updateProductQuantity = async (productId: string, quantity: number) => {
        await updateProductQuantityInCart(productId, quantity);
        await refreshCart();
        if (quantity <= 0) {
            await removeProduct(productId);
        }
    };

    const handleUpdateProductQuantity = async (productId: string, quantity: number) => {
        if (quantity <= 0) {
            await removeProduct(productId);
        } else {
            await updateProductQuantity(productId, quantity);
        }
    };


    return (
        <CartContext.Provider
            value={{ cartProducts, addProductToCart, removeProduct, updateProductQuantity, handleUpdateProductQuantity, refreshCart }}
        >
            {children}
        </CartContext.Provider>
    );
};
