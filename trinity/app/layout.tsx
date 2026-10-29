import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/app/contexts/CartContext";
import { SessionProvider } from "next-auth/react";
import { siteUrl } from "@/lib/site-url";

const mulish = Mulish({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  // Base des URL relatives (Open Graph, canoniques) : voir lib/site-url
  metadataBase: new URL(siteUrl()),
  title: "Trinity Shop — Supermarché en ligne",
  description:
    "Supermarché en ligne complet : catalogue avec Nutri-Score, panier, commandes et factures PDF, back-office et PWA. Next.js, Prisma, PostgreSQL.",
  openGraph: {
    type: "website",
    siteName: "Trinity Shop",
    title: "Trinity Shop — Supermarché en ligne",
    description:
      "Supermarché en ligne complet : catalogue avec Nutri-Score, panier, factures PDF, back-office et PWA.",
    url: "/",
    locale: "fr_FR",
    images: [
      {
        url: "/og.png?v=2",
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
    images: ["/og.png?v=2"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={mulish.variable}>
      <body className="font-sans">
        <SessionProvider>
          <CartProvider>{children}</CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
