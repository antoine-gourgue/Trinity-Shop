import Link from "next/link";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Briques visuelles du back-office, alignées sur la boutique (cartes arrondies, couleurs de marque)

export function AdminPageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            <ChevronLeft size={16} aria-hidden /> {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const TONES = {
  brand: "bg-secondary text-primary",
  promo: "bg-promo/10 text-promo",
  bio: "bg-bio/10 text-bio",
  highlight: "bg-highlight/25 text-brand-dark",
  muted: "bg-muted text-muted-foreground",
} as const;

export type Tone = keyof typeof TONES;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
}) {
  const content = (
    <>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[tone])}>
        <Icon size={20} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-2xl font-black tabular-nums">{value}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </>
  );
  const className = "flex h-full items-start gap-4 rounded-3xl border bg-white p-5";
  return href ? (
    <Link href={href} className={cn(className, "transition-shadow hover:shadow-lg")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  padded = true,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("overflow-hidden rounded-3xl border bg-white", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="font-extrabold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

const BADGES = {
  brand: "bg-secondary text-primary",
  success: "bg-bio/10 text-bio",
  danger: "bg-promo/10 text-promo",
  warning: "bg-highlight/30 text-brand-dark",
  muted: "bg-muted text-muted-foreground",
  dark: "bg-brand-dark text-white",
} as const;

export function Badge({ tone = "muted", children }: { tone?: keyof typeof BADGES; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold", BADGES[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon size={26} aria-hidden />
      </span>
      <p className="mt-1 font-extrabold">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

// Tableau : défilement horizontal sur mobile, en-têtes discrets, lignes séparées
export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("whitespace-nowrap border-b bg-muted/40 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b px-4 py-3 align-middle", className)}>{children}</td>;
}

export function AdminPagination({
  page,
  pageCount,
  total,
  href,
  unit,
}: {
  page: number;
  pageCount: number;
  total: number;
  href: (page: number) => string;
  unit: [string, string];
}) {
  const label = `${total} ${total > 1 ? unit[1] : unit[0]}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
      <p className="text-muted-foreground">
        {label}
        {pageCount > 1 && ` · page ${page} sur ${pageCount}`}
      </p>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-2">
          <PageLink href={href(page - 1)} disabled={page <= 1} label="Page précédente">
            <ChevronLeft size={16} aria-hidden />
          </PageLink>
          <PageLink href={href(page + 1)} disabled={page >= pageCount} label="Page suivante">
            <ChevronRight size={16} aria-hidden />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  const className = "flex h-9 w-9 items-center justify-center rounded-full border bg-white";
  return disabled ? (
    <span aria-disabled className={cn(className, "text-muted-foreground/50")}>
      {children}
    </span>
  ) : (
    <Link href={href} aria-label={label} className={cn(className, "transition-colors hover:border-primary hover:text-primary")}>
      {children}
    </Link>
  );
}

// URL d'une liste admin avec ses paramètres (la page revient à 1 quand un filtre change)
export function adminHref(path: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && !(key === "page" && Number(value) <= 1) && !(key === "filtre" && value === "tous")) {
      query.set(key, String(value));
    }
  }
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

export function formatDate(date: Date, withTime = false) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
