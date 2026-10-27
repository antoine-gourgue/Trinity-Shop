"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Boxes, ClipboardCheck, LayoutDashboard, LogOut, Menu, Package, ShoppingBag, Store, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Le catalogue et les clients sont gérés par le siège ; un compte magasin ne voit que son activité
const LINKS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, headOffice: false },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingBag, headOffice: false },
  { href: "/admin/preparation", label: "Préparation", icon: ClipboardCheck, headOffice: false },
  { href: "/admin/products", label: "Produits", icon: Package, headOffice: true },
  { href: "/admin/stocks", label: "Stocks", icon: Boxes, headOffice: false },
  { href: "/admin/users", label: "Clients", icon: Users, headOffice: true },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Brand({ store }: { store: string | null }) {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
        <Image src="/assets/trinity-logo.png" alt="" width={28} height={28} unoptimized />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-black tracking-wide text-white">TRINITY</span>
        <span className="block text-[11px] font-extrabold uppercase tracking-widest text-highlight">{store ?? "Administration"}</span>
      </span>
    </Link>
  );
}

function NavLinks({ store, onNavigate }: { store: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {LINKS.filter((link) => !store || !link.headOffice).map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors",
                active ? "bg-white text-brand-dark" : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Footer({ name, email, store }: { name: string; email: string; store: string | null }) {
  return (
    <div className="space-y-3 border-t border-white/10 pt-4">
      {/* Un compte magasin n'a pas accès à la boutique */}
      {!store && (
        <Link
          href="/"
          className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Store size={18} aria-hidden /> Voir la boutique
        </Link>
      )}
      <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-highlight text-sm font-black text-brand-dark">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-white">{name}</span>
          <span className="block truncate text-xs text-white/60">{email}</span>
        </span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          aria-label="Se déconnecter"
          className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

// Menu du back-office ; `store` est le nom du magasin d'un compte magasin, null pour le siège
export default function AdminNav({ name, email, store }: { name: string; email: string; store: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Ordinateur : barre latérale fixe */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-8 bg-brand-dark px-4 py-6 lg:flex">
        <Brand store={store} />
        <nav aria-label="Administration" className="flex-1">
          <NavLinks store={store} />
        </nav>
        <Footer name={name} email={email} store={store} />
      </aside>

      {/* Mobile : bandeau et menu coulissant */}
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-brand-dark px-4 py-3 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button type="button" aria-label="Ouvrir le menu" className="rounded-full p-2 text-white hover:bg-white/10">
              <Menu size={22} aria-hidden />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col gap-8 border-none bg-brand-dark p-4 py-6 text-white">
            <SheetTitle className="sr-only">Menu de l’administration</SheetTitle>
            <Brand store={store} />
            <nav aria-label="Administration" className="flex-1">
              <NavLinks store={store} onNavigate={() => setOpen(false)} />
            </nav>
            <Footer name={name} email={email} store={store} />
          </SheetContent>
        </Sheet>
        <Brand store={store} />
      </div>
    </>
  );
}
