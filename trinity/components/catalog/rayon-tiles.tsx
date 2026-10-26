import Image from "next/image";
import Link from "next/link";
import { RAYON_LINKS } from "@/lib/rayons";
import { cn } from "@/lib/utils";

export default function RayonTiles({ className }: { className?: string }) {
  return (
    <ul className={cn("grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9", className)}>
      {RAYON_LINKS.map((rayon) => (
        <li key={rayon.slug}>
          <Link
            href={rayon.href}
            className="group flex h-full flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/40 sm:p-4"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary transition-colors group-hover:bg-primary/15 sm:h-16 sm:w-16">
              <Image src={rayon.image} alt="" width={40} height={40} className="h-9 w-auto object-contain sm:h-10" />
            </span>
            <span className="text-xs font-bold leading-tight text-brand-dark sm:text-sm">{rayon.shortName}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
