import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}

export default function Logo({ className, compact, inverted }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="Trinity Shop, retour à l'accueil"
      className={cn("flex shrink-0 items-center gap-2.5", className)}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          inverted ? "bg-white" : "bg-secondary"
        )}
      >
        <Image src="/assets/trinity-logo.png" alt="" width={28} height={28} priority />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-xl font-black uppercase tracking-tight",
              inverted ? "text-white" : "text-brand-dark"
            )}
          >
            Trinity
          </span>
          <span
            className={cn(
              "mt-0.5 text-[11px] font-bold uppercase tracking-[0.18em]",
              inverted ? "text-white/70" : "text-primary"
            )}
          >
            Courses en ligne
          </span>
        </span>
      )}
    </Link>
  );
}
