import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { RayonLink } from "@/lib/rayons";

interface RayonsNavProps {
  rayons: RayonLink[];
}

// Menu des rayons desktop : un panneau de sous-catégories s'ouvre au survol ou au focus clavier
export default function RayonsNav({ rayons }: RayonsNavProps) {
  return (
    <nav aria-label="Rayons" className="relative hidden border-b bg-white md:block">
      <ul className="mx-auto flex h-12 max-w-[1400px] items-stretch justify-between overflow-x-auto px-6 lg:overflow-visible xl:justify-start">
        {rayons.map((rayon) => (
          <li key={rayon.slug} className="group flex">
            <Link
              href={rayon.href}
              className="flex items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-bold lg:px-2 lg:text-[13px] xl:px-3 xl:text-sm text-foreground/80 transition-colors hover:border-primary hover:text-primary group-has-[:focus-visible]:border-primary group-has-[:focus-visible]:text-primary"
            >
              {rayon.shortName}
            </Link>

            <div className="invisible absolute inset-x-0 top-full z-50 hidden border-b border-t bg-white opacity-0 shadow-xl transition-opacity duration-150 group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100 group-hover:visible group-hover:opacity-100 lg:block">
              <div className="mx-auto flex max-w-[1400px] gap-10 px-6 py-6">
                <Link
                  href={rayon.href}
                  className="flex w-56 shrink-0 flex-col items-center justify-center gap-3 rounded-xl bg-secondary p-6 text-center transition-colors hover:bg-secondary/70"
                >
                  <Image src={rayon.image} alt="" width={72} height={72} className="h-[72px] w-auto object-contain" />
                  <span className="font-extrabold text-brand-dark">{rayon.name}</span>
                  <span className="flex items-center gap-1 text-sm font-bold text-primary">
                    Tout le rayon <ChevronRight size={16} aria-hidden />
                  </span>
                </Link>

                <ul className="grid flex-1 auto-rows-min grid-cols-3 gap-x-8 gap-y-1">
                  {rayon.links.map((link) => (
                    <li key={link.id}>
                      <Link
                        href={link.href}
                        className="block rounded-md px-2 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted hover:text-primary"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
