import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/app/contexts/CartContext";
import { SessionProvider } from "next-auth/react";

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
        <SessionProvider>
          <CartProvider>{children}</CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
