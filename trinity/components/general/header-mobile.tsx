import {
  Barcode,
  BookUser,
  Home,
  LogOut,
  Minus,
  Package,
  Plus,
  QrCode,
  Scan,
  ScanBarcode,
  Search,
  ShoppingBasket,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "../ui/responsiveDialog";
import ScannerDrawer from "../scanner/scannerDrawer";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/contexts/CartContext";
import Image from "next/image";
import { Badge } from "../ui/badge";
import SearchProduct from "../product/searchProduct";
import { useState } from "react";

export default function HeaderMobile() {
  const { data: session } = useSession();
  const [openSearch, setOpenSearch] = useState(false);
  const router = useRouter();
  const { cartProducts, removeProduct, handleUpdateProductQuantity, updateProductQuantity } =
    useCart();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const totalItems = cartProducts.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cartProducts.reduce(
    (acc, product) => acc + product.price * product.quantity,
    0
  );
  const totalPriceEuro = (totalPrice / 1000).toFixed(2);

  return (
    <header className="bg-white border-t fixed bottom-0 w-full p-2 grid grid-cols-5 gap-2 z-50">
      <Button
        variant={"ghost"}
        className="text-slate-500 flex flex-col items-center gap-1 w-auto h-auto"
        asChild
      >
        <Link href={"/"}>
          <Home className="w-6 h-6" />
          Accueil
        </Link>
      </Button>
      <ResponsiveDialog open={openSearch} onOpenChange={setOpenSearch}>
        <ResponsiveDialogTrigger asChild>
          <Button
            variant={"ghost"}
            className="text-slate-500 flex flex-col items-center gap-1 w-auto h-auto"
          >
            <Search className="w-6 h-6" />
            Chercher
          </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent className="flex flex-col gap-4 p-4">
          <ResponsiveDialogTitle className="text-center">
            Recherche
          </ResponsiveDialogTitle>
          <SearchProduct setOpenSearch={setOpenSearch} />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog>
        <ResponsiveDialogTrigger asChild>
          <Button className="rounded-full p-3 w-auto h-auto bg-teal-600 relative">
            <ShoppingBasket width={24} height={24} />
            {totalItems > 0 && (
              <Badge className="bg-red-500 text-white absolute top-0 right-0 transform translate-x-3 -translate-y-2">
                {totalItems}
              </Badge>
            )}
          </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent className="w-full p-4 bg-white shadow-xl rounded-lg">
          <ResponsiveDialogHeader className="bg-teal-700 text-white p-4 rounded-t-lg shadow-md">
            <div className="flex items-center gap-2">
              <ResponsiveDialogTitle className="text-white text-lg font-semibold">
                Mon Panier
              </ResponsiveDialogTitle>
            </div>
          </ResponsiveDialogHeader>

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
                      <h3 className="font-semibold text-gray-800 text-xs">
                        {product.name}
                      </h3>
                      <p className="text-sm font-bold text-gray-900">
                        {(product.price / 1000).toFixed(2)} €
                      </p>
                      <p className="text-xs text-gray-500">
                        Prix au kg {(product.price / 1000).toFixed(2)} €
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                          onClick={() => updateProductQuantity(product.id, 0)}
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
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ScannerDrawer>
        <Button
          variant={"ghost"}
          className="text-slate-500 flex flex-col items-center gap-1 w-auto h-auto"
        >
          <ScanBarcode className="w-6 h-6" />
          Scann
        </Button>
      </ScannerDrawer>
      <ResponsiveDialog>
        <ResponsiveDialogTrigger asChild>
          <Button
            variant={"ghost"}
            className="text-slate-500 flex flex-col items-center gap-1 w-auto h-auto"
          >
            <User className="w-6 h-6" />
            Profil
          </Button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent className="flex flex-col gap-4 p-4 text-sm text-slate-500">
          <ResponsiveDialogTitle className="text-center">
            Mon compte
          </ResponsiveDialogTitle>
          {session ? (
            <>
              <Link
                href={`/user?userId=${session.user.id}`}
                className="flex items-center gap-3"
              >
                <BookUser size={24} />
                Mon Compte
              </Link>
              <Link href="/cart" className="flex items-center gap-3">
                <ShoppingBasket size={24} />
                Mon Panier
              </Link>
              <Link
                href={`/user/${session?.user?.id}/order`}
                className="flex items-center gap-3"
              >
                <Package size={24} />
                Mes Commandes
              </Link>
              {session?.user?.role === "Admin" && (
                <Link href="/admin" className="flex items-center gap-3">
                  <Users size={24} />
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3"
              >
                <LogOut className="text-red-500" size={24} />
                Déconnexion
              </button>
            </>
          ) : (
            <Link href="/api/auth/signin" className="flex items-center gap-3">
              <User className="text-teal-600" size={30} />
              <span className="text-gray-800 text-sm">Se connecter</span>
            </Link>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </header>
  );
}
