import Image from "next/image";
import Link from "next/link";

// Pages du drive ouvertes depuis un e-mail, souvent sur un téléphone : un en-tête simple, sans le
// choix du magasin ni le panier de la boutique
export default function DriveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/50">
      <header className="bg-brand-dark">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <Image src="/assets/trinity-logo.png" alt="" width={28} height={28} unoptimized />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-black tracking-wide text-white">TRINITY</span>
              <span className="block text-[11px] font-extrabold uppercase tracking-widest text-highlight">Drive</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-6">{children}</main>
    </div>
  );
}
