"use client";

import { useState, useTransition } from "react";
import { setCartReminders } from "@/lib/server-actions/email-preferences-actions";

// Case « rappels de panier par e-mail » de l'espace client
export default function CartRemindersToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setEnabled(next);
    startTransition(async () => {
      const { ok } = await setCartReminders(next);
      if (!ok) setEnabled(!next);
    });
  };

  return (
    <label className="flex cursor-pointer items-start gap-3 py-3">
      <input
        type="checkbox"
        checked={enabled}
        disabled={isPending}
        onChange={(event) => toggle(event.target.checked)}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <span>
        <span className="block text-sm font-bold">Rappels de panier par e-mail</span>
        <span className="block text-sm text-muted-foreground">
          Un rappel quand des articles restent dans votre panier sans commande. Les e-mails liés à vos commandes sont
          toujours envoyés.
        </span>
      </span>
    </label>
  );
}
