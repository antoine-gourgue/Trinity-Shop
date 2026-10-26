import Link from "next/link";
import { SearchX } from "lucide-react";
import ShopShell from "@/components/general/shop-shell";
import RayonTiles from "@/components/catalog/rayon-tiles";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <ShopShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 md:px-6">
        <div className="flex flex-col items-center gap-4 rounded-3xl border bg-white px-6 py-14 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-primary">
            <SearchX size={36} aria-hidden />
          </span>
          <p className="text-sm font-extrabold uppercase tracking-widest text-primary">Erreur 404</p>
          <h1 className="text-3xl font-black">Cette page est introuvable</h1>
          <p className="max-w-md text-muted-foreground">
            Le produit ou la page que vous cherchez n’existe plus ou a changé d’adresse.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-6 font-bold">
              <Link href="/">Retour à l’accueil</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-6 font-bold">
              <Link href="/produits?promo=1">Voir les promos</Link>
            </Button>
          </div>
        </div>

        <h2 className="mb-4 mt-10 text-xl font-black">Parcourir nos rayons</h2>
        <RayonTiles />
      </div>
    </ShopShell>
  );
}
