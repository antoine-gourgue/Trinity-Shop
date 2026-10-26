import Header from "@/components/general/header";
import TopBar from "@/components/general/top-bar";
import RayonsNav from "@/components/general/rayons-nav";
import Footer from "@/components/general/footer";
import { RAYON_LINKS } from "@/lib/rayons";
import { Toaster } from "@/components/ui/toaster";

// Habillage commun des pages boutique : en-tête, menu des rayons et pied de page
export default function ShopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/50 pb-20 md:pb-0">
      <TopBar />
      <div data-sticky-header className="sticky top-0 z-40 shadow-sm">
        <Header rayons={RAYON_LINKS} />
        <RayonsNav rayons={RAYON_LINKS} />
      </div>
      <main className="flex-1">{children}</main>
      <Footer rayons={RAYON_LINKS} />
      <Toaster />
    </div>
  );
}
