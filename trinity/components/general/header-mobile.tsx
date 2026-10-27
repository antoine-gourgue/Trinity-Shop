"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BadgePercent, ChevronRight, Heart, Home, LayoutGrid, LogOut, Package, Recycle, ScanBarcode, ShieldCheck, ShoppingBasket, User, UserPlus } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "../ui/responsiveDialog";
import ScannerDrawer from "../scanner/scannerDrawer";
import { useCart } from "@/app/contexts/CartContext";
import CartSheetContent from "@/components/cart/cart-sheet-content";
import { cn } from "@/lib/utils";
import type { RayonLink } from "@/lib/rayons";

interface HeaderMobileProps {
  rayons: RayonLink[];
}

const tabClass =
  "flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors";

export default function HeaderMobile({ rayons }: HeaderMobileProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { cartProducts } = useCart();
  const [openPanel, setOpenPanel] = useState<"rayons" | "cart" | "account" | null>(null);

  const totalItems = cartProducts.reduce((acc, item) => acc + item.quantity, 0);
  const close = () => setOpenPanel(null);
  const panelProps = (panel: NonNullable<typeof openPanel>) => ({
    open: openPanel === panel,
    onOpenChange: (open: boolean) => setOpenPanel(open ? panel : null),
  });

  const handleLogout = async () => {
    close();
    await signOut({ redirect: false });
    router.push("/");
  };

  const accountLinkClass =
    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors hover:bg-muted";

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden"
    >
      <Link href="/" className={cn(tabClass, pathname === "/" && "text-primary")}>
        <Home size={22} />
        Accueil
      </Link>

      <ResponsiveDialog {...panelProps("rayons")}>
        <ResponsiveDialogTrigger asChild>
          <button type="button" className={cn(tabClass, pathname.startsWith("/rayon") && "text-primary")}>
            <LayoutGrid size={22} />
            Rayons
          </button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent className="max-h-[85vh]">
          <ResponsiveDialogHeader className="text-left">
            <ResponsiveDialogTitle className="text-lg font-extrabold">Nos rayons</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="sr-only">
              Choisissez un rayon pour parcourir ses produits.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="overflow-y-auto px-4 pb-6">
          <Link
            href="/produits?promo=1"
            onClick={close}
            className="mb-3 flex items-center gap-3 rounded-xl bg-promo px-4 py-3 font-extrabold text-white"
          >
            <BadgePercent size={22} aria-hidden />
            Toutes les promos
          </Link>
          <Link
            href="/anti-gaspi"
            onClick={close}
            className="mb-3 flex items-center gap-3 rounded-xl bg-bio px-4 py-3 font-extrabold text-white"
          >
            <Recycle size={22} aria-hidden />
            Anti-gaspi : dates courtes à prix réduit
          </Link>
          <ul className="grid grid-cols-2 gap-3">
            {rayons.map((rayon) => (
              <li key={rayon.slug}>
                <Link
                  href={rayon.href}
                  onClick={close}
                  className="flex h-full flex-col items-center gap-2 rounded-xl bg-secondary p-4 text-center"
                >
                  <Image src={rayon.image} alt="" width={48} height={48} className="h-12 w-auto object-contain" />
                  <span className="text-sm font-bold leading-tight text-brand-dark">{rayon.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog {...panelProps("cart")}>
        <ResponsiveDialogTrigger asChild>
          <button
            type="button"
            aria-label={`Mon panier, ${totalItems} article${totalItems > 1 ? "s" : ""}`}
            className="relative -mt-6 flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-primary"
          >
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-white">
              <ShoppingBasket size={24} />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-[11px] font-extrabold text-brand-dark">
                  {totalItems}
                </span>
              )}
            </span>
            Panier
          </button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent className="flex max-h-[85vh] flex-col">
          <ResponsiveDialogHeader className="border-b text-left">
            <ResponsiveDialogTitle className="text-lg font-extrabold">Mon panier</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="sr-only">
              Les produits que vous avez ajoutés à votre panier.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <CartSheetContent onNavigate={close} />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ScannerDrawer>
        <button type="button" className={tabClass}>
          <ScanBarcode size={22} />
          Scanner
        </button>
      </ScannerDrawer>

      <ResponsiveDialog {...panelProps("account")}>
        <ResponsiveDialogTrigger asChild>
          <button type="button" className={cn(tabClass, pathname.startsWith("/user") && "text-primary")}>
            <User size={22} />
            Compte
          </button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader className="text-left">
            <ResponsiveDialogTitle className="text-lg font-extrabold">
              {session?.user.firstName ? `Bonjour ${session.user.firstName}` : "Mon compte"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {session ? session.user.email : "Connectez-vous pour faire vos courses."}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="flex flex-col gap-1 px-4 pb-6">
            {session ? (
              <>
                <AccountLink href={`/user?userId=${session.user.id}`} icon={User} onClick={close}>
                  Mon compte
                </AccountLink>
                <AccountLink href={`/user/${session.user.id}/order`} icon={Package} onClick={close}>
                  Mes commandes
                </AccountLink>
                <AccountLink href="/user/favoris" icon={Heart} onClick={close}>
                  Mes favoris
                </AccountLink>
                {session.user.role === "Admin" && (
                  <AccountLink href="/admin" icon={ShieldCheck} onClick={close}>
                    Administration
                  </AccountLink>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn(accountLinkClass, "text-destructive")}
                >
                  <LogOut size={20} />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <AccountLink href="/api/auth/signin" icon={User} onClick={close}>
                  Se connecter
                </AccountLink>
                <AccountLink href="/auth" icon={UserPlus} onClick={close}>
                  Créer un compte
                </AccountLink>
              </>
            )}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </nav>
  );
}

function AccountLink({
  href,
  icon: Icon,
  onClick,
  children,
}: {
  href: string;
  icon: typeof User;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors hover:bg-muted"
    >
      <Icon size={20} className="text-primary" />
      <span className="flex-1">{children}</span>
      <ChevronRight size={18} className="text-muted-foreground" />
    </Link>
  );
}
