"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BookUser,
  LogOut,
  Menu,
  Package,
  ShoppingBasket,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  Users,
  Search,
  ScanBarcode,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ScannerDrawer from "../scanner/scannerDrawer";
import { useCart } from "@/app/contexts/CartContext";
import { Skeleton } from "../ui/skeleton";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";
import HeaderMobile from "./header-mobile";

const Sidebar = dynamic(() => import("./sidebar"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-8" />,
});

export default function Header() {
  const { data: session } = useSession();
  const { cartProducts, removeProduct, handleUpdateProductQuantity } =
    useCart();
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const openSearch = () => {
    setShowSearch(true);
    requestAnimationFrame(() => setSearchOpen(true));
  };

  const closeSearch = () => {
    setSearchOpen(false);
  };

  useEffect(() => {
    if (!searchOpen && showSearch) {
      const t = setTimeout(() => {
        setShowSearch(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [searchOpen, showSearch]);

  const totalItems = cartProducts.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cartProducts.reduce(
    (acc, product) => acc + product.price * product.quantity,
    0
  );
  const totalPriceEuro = (totalPrice / 1000).toFixed(2);

  if (isMobile) {
    return <HeaderMobile />;
  }

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <button className="md:hidden p-2">
          <Menu size={26} className="text-blue-600" />
        </button>
        <Link href="/" className="flex items-center">
          <Image
            src="/assets/trinity-logo.png"
            alt="Accéder au Drive U sur CoursesU"
            width={50}
            height={20}
          />
        </Link>
        <div className="hidden md:flex flex-1 mx-4 md:mx-8">
          <Suspense>
            <SearchProduct />
          </Suspense>
        </div>
        <button className="md:hidden p-2" onClick={openSearch}>
          <Search size={22} className="text-teal-600" />
        </button>
        <div className="flex items-center gap-4">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 text-gray-700 ml-2">
                <User size={22} className="text-teal-600" />
                <span className="text-sm hidden md:inline">Mon Compte</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white shadow-xl rounded-lg p-3 w-56 animate-fade-in border border-gray-200 mt-3">
                <DropdownMenuLabel className="text-gray-900 font-semibold text-sm px-4">
                  Mon Compte
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-2 border-t border-gray-300" />
                <DropdownMenuItem
                  asChild
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-md transition"
                >
                  <Link
                    href={`/user?userId=${session.user.id}`}
                    className="flex items-center gap-3"
                  >
                    <BookUser className="text-teal-600" size={30} />
                    <span className="text-gray-800 text-sm">Mon Compte</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-md transition"
                >
                  <Link href="/cart" className="flex items-center gap-3">
                    <ShoppingBasket className="text-teal-600" size={30} />
                    <span className="text-gray-800 text-sm">Mon Panier</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-md transition"
                >
                  <Link
                    href={`/user/${session?.user?.id}/order`}
                    className="flex items-center gap-3"
                  >
                    <Package className="text-teal-600" size={30} />
                    <span className="text-gray-800 text-sm">Mes Commandes</span>
                  </Link>
                </DropdownMenuItem>
                {session?.user?.role === "Admin" && (
                  <DropdownMenuItem
                    asChild
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-md transition"
                  >
                    <Link href="/admin" className="flex items-center gap-3">
                      <Users className="text-teal-600" size={30} />
                      <span className="text-gray-800 text-sm">Admin</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-2 border-t border-gray-300" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-md transition"
                >
                  <LogOut className="text-red-500" size={20} />
                  <span className="text-sm font-medium">Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 text-gray-700 ml-2">
                <User size={22} className="text-teal-600" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white shadow-xl rounded-lg p-3 w-56 animate-fade-in border border-gray-200 mt-3">
                <DropdownMenuItem
                  asChild
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 rounded-md transition"
                >
                  <Link
                    href="/api/auth/signin"
                    className="flex items-center gap-3"
                  >
                    <User className="text-teal-600" size={30} />
                    <span className="text-gray-800 text-sm">Se connecter</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <div className="relative">
            <Sheet>
              <SheetTrigger className="relative flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-full cursor-pointer hover:bg-teal-700 transition">
                <ShoppingCart size={22} />
                <span className="hidden md:inline">Panier</span>
                {totalItems > 0 && (
                  <Badge className="bg-red-500 text-white absolute top-0 right-0 transform translate-x-3 -translate-y-2">
                    {totalItems}
                  </Badge>
                )}
              </SheetTrigger>

              <SheetContent className="sm:w-full p-4 bg-white shadow-xl rounded-lg">
                <SheetHeader className="bg-teal-700 text-white p-4 rounded-t-lg shadow-md">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={24} className="text-white" />
                    <SheetTitle className="text-white text-lg font-semibold">
                      Mon Panier
                    </SheetTitle>
                  </div>
                </SheetHeader>

                <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto p-2">
                  {cartProducts.length === 0 ? (
                    <p className="text-gray-500 text-center">
                      Votre panier est vide.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {cartProducts.map((product) => (
                        <li
                          key={product.id}
                          className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                        >
                          <Image
                            src={product.picture}
                            alt={product.name}
                            width={80}
                            height={80}
                            className="rounded-md object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 text-sm">
                              {product.name}
                            </h3>
                            <p className="text-lg font-bold text-gray-900">
                              {(product.price / 1000).toFixed(2)} €
                            </p>
                            <p className="text-xs text-gray-500">
                              Prix au kg {(product.price / 1000).toFixed(2)} €
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => removeProduct(product.id)}
                              className="text-gray-500 hover:text-gray-700 transition"
                            >
                              <Trash2 size={18} />
                            </button>
                            <div className="flex items-center bg-teal-600 text-white rounded-full px-3 py-2">
                              <button
                                onClick={() =>
                                  handleUpdateProductQuantity(
                                    product.id,
                                    product.quantity - 1
                                  )
                                }
                                className="hover:opacity-80"
                              >
                                <Minus size={16} />
                              </button>

                              <span className="mx-2 text-sm font-semibold">
                                {product.quantity}
                              </span>

                              <button
                                onClick={() =>
                                  handleUpdateProductQuantity(
                                    product.id,
                                    product.quantity + 1
                                  )
                                }
                                className="hover:opacity-80"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {cartProducts.length > 0 && (
                  <div className="mt-6 border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total estimé :</span>
                      <span className="text-gray-900">{totalPriceEuro} €</span>
                    </div>
                    <Link href="/cart">
                      <Button className="w-full bg-teal-600 text-white font-bold mt-3 hover:bg-teal-700 transition">
                        Valider mon Panier
                      </Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
          <ScannerDrawer>
            <ScanBarcode />
          </ScannerDrawer>
        </div>
      </div>
      {showSearch && (
        <div
          onClick={closeSearch}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md bg-white rounded-b-3xl shadow-xl p-6 ${
              searchOpen ? "animate-slide-down" : "animate-slide-up"
            }`}
          >
            <button
              onClick={closeSearch}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition"
            />
            <h2 className="text-xl font-semibold text-center">Recherche</h2>
            <div className="mt-6">
              <Suspense>
                <SearchProduct onSearch={closeSearch} />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
