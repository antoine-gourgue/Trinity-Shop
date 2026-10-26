"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { AdminResult } from "@/lib/server-actions/admin-actions";
import { cn } from "@/lib/utils";

// Action à confirmer (suppression, annulation) : fenêtre de confirmation, puis message de résultat
export default function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  successMessage,
  action,
  redirectTo,
  tone = "danger",
}: {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  successMessage: string;
  action: () => Promise<AdminResult>;
  redirectTo?: string;
  tone?: "danger" | "brand";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => ({ ok: false as const, error: "L'action n'a pas abouti. Réessayez." }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast({ description: successMessage });
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        {error && <p className="rounded-2xl bg-promo/10 px-4 py-3 text-sm font-semibold text-promo">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-11 rounded-full border px-5 text-sm font-bold transition-colors hover:border-primary hover:text-primary"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={run}
            disabled={isPending}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white transition-colors disabled:opacity-60",
              tone === "danger" ? "bg-promo hover:bg-promo/90" : "bg-primary hover:bg-brand-dark"
            )}
          >
            {isPending && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
