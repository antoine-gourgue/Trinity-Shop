"use client";

import { useState, useTransition } from "react";
import { Repeat } from "lucide-react";
import { setAllowSubstitute } from "@/lib/server-actions/substitution-actions";

// Case « remplacement accepté » d'un article du panier
export default function SubstituteToggle({ productId, initial }: { productId: string; initial: boolean }) {
  const [allowed, setAllowed] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setAllowed(next);
    startTransition(async () => {
      const { ok } = await setAllowSubstitute(productId, next);
      if (!ok) setAllowed(!next);
    });
  };

  return (
    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        checked={allowed}
        disabled={isPending}
        onChange={(event) => toggle(event.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      <Repeat size={13} aria-hidden />
      Remplacement par un produit équivalent accepté en cas de rupture
    </label>
  );
}
