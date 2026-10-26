import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Option de filtre sous forme de lien : fonctionne sans JavaScript et reste partageable
export function FilterOption({
  href,
  active,
  count,
  disabled,
  shape = "checkbox",
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  disabled?: boolean;
  shape?: "checkbox" | "radio";
  children: React.ReactNode;
}) {
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors",
          shape === "radio" ? "rounded-full" : "rounded-md",
          active ? "border-primary bg-primary text-white" : "border-input bg-white"
        )}
      >
        {active && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="flex flex-1 items-center gap-2">{children}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
    </>
  );

  const className = "flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-semibold";

  if (disabled) {
    return (
      <li>
        <span className={cn(className, "cursor-not-allowed opacity-40")}>{content}</span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={cn(className, "transition-colors hover:bg-muted", active && "text-primary")}
      >
        {content}
      </Link>
    </li>
  );
}
