"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Heart,
  LogOut,
  Package,
  ScanBarcode,
  ShieldCheck,
  ShoppingBasket,
  User,
  UserPlus,
} from "lucide-react";
import SearchProduct from "@/components/product/searchProduct";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ScannerDrawer from "../scanner/scannerDrawer";
import { useCart } from "@/app/contexts/CartContext";
import CartSheetContent from "@/components/cart/cart-sheet-content";
import Logo from "@/components/general/logo";
import HeaderMobile from "./header-mobile";
import { formatPrice } from "@/lib/format";
import { useFavorites } from "@/lib/favorites-store";
import type { RayonLink } from "@/lib/rayons";

interface HeaderProps {
  rayons: RayonLink[];
}

const searchFallback = <div className="h-11 w-full rounded-full bg-muted" />;

export default function Header({ rayons }: HeaderProps) {
  const { cartProducts } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  const totalItems = cartProducts.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cartProducts.reduce(
    (acc, product) => acc + product.price * product.quantity,
    0
  );

  return (
    <>
      <header className="hidden border-b bg-white md:block">
        <div className="mx-auto flex h-[76px] max-w-[1400px] items-center gap-6 px-6">
          <Logo />

          <div className="mx-auto flex max-w-3xl flex-1 items-center gap-2">
            <Suspense fallback={searchFallback}>
              <SearchProduct />
            </Suspense>
            <ScannerDrawer>
              <button
                type="button"
                aria-label="Scanner un code-barres"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-input text-primary transition-colors hover:bg-secondary"
              >
                <ScanBarcode size={20} />
              </button>
            </ScannerDrawer>
          </div>

          <AccountMenu />
          <FavoritesLink />

          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger
              aria-label={`Mon panier, ${totalItems} article${totalItems > 1 ? "s" : ""}`}
              className="flex h-12 shrink-0 items-center gap-3 rounded-full bg-primary px-4 text-primary-foreground transition-colors hover:bg-brand-dark lg:pr-5"
            >
              <span className="relative">
                <ShoppingBasket size={24} />
                {totalItems > 0 && (
                  <span className="absolute -right-2.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-[11px] font-extrabold text-brand-dark">
                    {totalItems}
                  </span>
                )}
              </span>
              <span className="hidden flex-col items-start leading-tight lg:flex">
                <span className="text-[11px] font-semibold text-white/80">Mon panier</span>
                <span className="text-sm font-extrabold">{formatPrice(totalPrice)}</span>
              </span>
            </SheetTrigger>

            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
              <SheetHeader className="border-b px-5 py-4 text-left">
                <SheetTitle className="flex items-center gap-2 text-lg font-extrabold">
                  <ShoppingBasket size={22} className="text-primary" />
                  Mon panier
                  {totalItems > 0 && (
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-brand-dark">
                      {totalItems} article{totalItems > 1 ? "s" : ""}
                    </span>
                  )}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Les produits que vous avez ajoutés à votre panier.
                </SheetDescription>
              </SheetHeader>
              <CartSheetContent onNavigate={() => setCartOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <header className="flex items-center gap-3 border-b bg-white px-4 py-2.5 md:hidden">
        <Logo compact />
        <Suspense fallback={searchFallback}>
          <SearchProduct className="h-10" />
        </Suspense>
      </header>

      <HeaderMobile rayons={rayons} />
    </>
  );
}

function AccountMenu() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const itemClass = "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex shrink-0 items-center gap-2.5 rounded-full p-1 pr-2 text-left transition-colors hover:bg-muted">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
          <User size={20} />
        </span>
        <span className="hidden flex-col leading-tight lg:flex">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {session ? (session.user.firstName ? `Bonjour ${session.user.firstName}` : "Bonjour") : "Identifiez-vous"}
          </span>
          <span className="text-sm font-extrabold">Mon compte</span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 rounded-xl p-2">
        {session ? (
          <>
            <DropdownMenuLabel className="px-3 py-2">
              {session.user.firstName && (
                <span className="block text-sm font-extrabold">
                  {session.user.firstName} {session.user.lastName}
                </span>
              )}
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {session.user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className={itemClass}>
              <Link href={`/user?userId=${session.user.id}`}>
                <User size={18} className="text-primary" /> Mon compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href={`/user/${session.user.id}/order`}>
                <Package size={18} className="text-primary" /> Mes commandes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/user/favoris">
                <Heart size={18} className="text-primary" /> Mes favoris
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/cart">
                <ShoppingBasket size={18} className="text-primary" /> Mon panier
              </Link>
            </DropdownMenuItem>
            {session.user.role === "Admin" && (
              <DropdownMenuItem asChild className={itemClass}>
                <Link href="/admin">
                  <ShieldCheck size={18} className="text-primary" /> Administration
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className={`${itemClass} text-destructive focus:bg-destructive/10 focus:text-destructive`}
            >
              <LogOut size={18} /> Déconnexion
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/api/auth/signin">
                <User size={18} className="text-primary" /> Se connecter
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/auth">
                <UserPlus size={18} className="text-primary" /> Créer un compte
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Cœur de l'en-tête : mène aux favoris, avec leur nombre
function FavoritesLink() {
  const count = useFavorites().size;

  return (
    <Link
      href="/user/favoris"
      aria-label={count > 0 ? `Mes favoris, ${count} produit${count > 1 ? "s" : ""}` : "Mes favoris"}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-muted"
    >
      <Heart size={22} className={count > 0 ? "fill-promo text-promo" : undefined} aria-hidden />
      {count > 0 && (
        <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-promo px-1 text-[11px] font-extrabold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
