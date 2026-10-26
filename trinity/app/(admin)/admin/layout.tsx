import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import AdminNav from "@/components/admin/admin-nav";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "Administration — Trinity Shop", template: "%s — Administration Trinity" },
  robots: { index: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Rôle relu en base : un compte rétrogradé perd l'accès immédiatement
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, email: true, role: true },
      })
    : null;

  if (user?.role !== "Admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
            <Lock size={28} aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-black">Accès réservé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user
              ? "Votre compte n'a pas les droits d'administration de Trinity Shop."
              : "Connectez-vous avec un compte administrateur pour accéder au back-office."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {!user && (
              <Link
                href="/auth/signin?callbackUrl=/admin"
                className="flex h-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground transition-colors hover:bg-brand-dark"
              >
                Se connecter
              </Link>
            )}
            <Link
              href="/"
              className="flex h-12 items-center justify-center rounded-full border font-bold transition-colors hover:border-primary hover:text-primary"
            >
              Retour à la boutique
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <AdminNav name={`${user.firstName} ${user.lastName}`.trim()} email={user.email} />
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
