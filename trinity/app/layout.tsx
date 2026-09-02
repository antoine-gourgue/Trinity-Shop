import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/app/contexts/CartContext";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://trinity-shop-rho.vercel.app"),
  title: "Trinity Shop — Supermarché en ligne",
  description:
    "Supermarché en ligne complet : catalogue avec Nutri-Score, panier, commandes et factures PDF, back-office et PWA. Next.js, Prisma, PostgreSQL.",
  openGraph: {
    type: "website",
    siteName: "Trinity Shop",
    title: "Trinity Shop — Supermarché en ligne",
    description:
      "Supermarché en ligne complet : catalogue avec Nutri-Score, panier, factures PDF, back-office et PWA.",
    url: "https://trinity-shop-rho.vercel.app/",
    locale: "fr_FR",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Trinity Shop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trinity Shop — Supermarché en ligne",
    description:
      "Supermarché en ligne complet : catalogue Nutri-Score, panier, factures PDF, back-office et PWA.",
    images: ["/og.png"],
  },
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
