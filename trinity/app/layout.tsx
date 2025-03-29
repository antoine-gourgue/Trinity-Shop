import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/app/contexts/CartContext";
import PayPalProvider from "@/app/contexts/PayPalProvider";

export const metadata: Metadata = {
  title: "Trinity",
  description: "A modern e-commerce platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="mb-[81px]">
        <CartProvider>
          <PayPalProvider>{children}</PayPalProvider>
        </CartProvider>
      </body>
    </html>
  );
}
