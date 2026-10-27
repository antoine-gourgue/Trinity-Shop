import Header from "@/components/general/header";
import TopBar from "@/components/general/top-bar";
import RayonsNav from "@/components/general/rayons-nav";
import Footer from "@/components/general/footer";
import { RAYON_LINKS } from "@/lib/rayons";
import { Toaster } from "@/components/ui/toaster";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import StoreProvider, { StorePickerDialog } from "@/components/store/store-provider";
import { currentStore } from "@/lib/current-store";

// Habillage commun des pages boutique : magasin du visiteur, en-tête, menu des rayons et pied de page
export default async function ShopShell({ children }: { children: React.ReactNode }) {
  // Un compte magasin travaille dans son back-office : la boutique le renvoie vers ses commandes et ses stocks
  const session = await auth();
  if (session?.user?.role === "StoreManager") redirect("/admin");
  const store = await currentStore();

  return (
    <StoreProvider store={store}>
      <div className="flex min-h-screen flex-col bg-muted/50 pb-20 md:pb-0">
        <TopBar />
        <div data-sticky-header className="sticky top-0 z-40 shadow-sm">
          <Header rayons={RAYON_LINKS} />
          <RayonsNav rayons={RAYON_LINKS} />
        </div>
        <main className="flex-1">{children}</main>
        <Footer rayons={RAYON_LINKS} />
        <Toaster />
        <StorePickerDialog />
      </div>
    </StoreProvider>
  );
}
