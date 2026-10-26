"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { CreditCard, Heart, LayoutDashboard, LogOut, MapPin, Package, Phone, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountNavProps {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isAdmin: boolean;
}

// Menu de l'espace client : colonne sur desktop, onglets défilants sur mobile
export default function AccountNav({ userId, firstName, lastName, email, isAdmin }: AccountNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    { href: `/user?userId=${userId}`, label: "Tableau de bord", icon: LayoutDashboard, active: pathname === "/user" },
    { href: `/user/${userId}/order`, label: "Mes commandes", icon: Package, active: pathname.includes("/order") },
    { href: "/user/favoris", label: "Mes favoris", icon: Heart, active: pathname === "/user/favoris" },
    { href: "/user/fidelite", label: "Ma Carte Trinity", icon: CreditCard, active: pathname === "/user/fidelite" },
    { href: `/user/info?userId=${userId}`, label: "Mes informations", icon: UserRound, active: pathname === "/user/info" },
    { href: `/user/addresses?userId=${userId}`, label: "Mes adresses", icon: MapPin, active: pathname === "/user/addresses" },
    { href: `/user/phone?userId=${userId}`, label: "Mon téléphone", icon: Phone, active: pathname === "/user/phone" },
    ...(isAdmin ? [{ href: "/admin", label: "Administration", icon: ShieldCheck, active: false }] : []),
  ];

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <aside className="min-w-0 lg:sticky lg:top-[140px] lg:self-start">
      <div className="hidden items-center gap-3 rounded-t-3xl bg-brand-dark p-5 text-white lg:flex">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-lg font-black text-brand-dark">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-extrabold">
            {firstName} {lastName}
          </p>
          <p className="truncate text-xs text-white/70">{email}</p>
        </div>
      </div>

      <nav
        aria-label="Mon compte"
        className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:rounded-b-3xl lg:border lg:border-t-0 lg:bg-white lg:p-3 lg:px-3"
      >
        <ul className="flex gap-2 lg:flex-col lg:gap-0.5">
          {items.map(({ href, label, icon: Icon, active }) => (
            <li key={label} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition-colors lg:rounded-xl lg:border-0 lg:py-2.5",
                  active
                    ? "border-primary bg-primary text-primary-foreground lg:bg-secondary lg:text-brand-dark"
                    : "bg-white text-foreground/80 hover:bg-muted hover:text-primary"
                )}
              >
                <Icon size={18} className={cn("shrink-0", active ? "lg:text-primary" : "text-primary")} aria-hidden />
                {label}
              </Link>
            </li>
          ))}
          <li className="shrink-0 lg:mt-1 lg:border-t lg:pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 whitespace-nowrap rounded-full border bg-white px-4 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 lg:rounded-xl lg:border-0 lg:py-2.5"
            >
              <LogOut size={18} aria-hidden />
              Déconnexion
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
