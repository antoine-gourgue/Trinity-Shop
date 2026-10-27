"use client";

import { useState, useTransition } from "react";
import { setEmailPreference } from "@/lib/server-actions/email-preferences-actions";
import type { EmailTopic } from "@/lib/email-preferences";

interface EmailPreferenceToggleProps {
  topic: EmailTopic;
  initial: boolean;
  title: string;
  description: string;
}

// Case à cocher d'un type d'e-mail commercial dans l'espace client
export default function EmailPreferenceToggle({ topic, initial, title, description }: EmailPreferenceToggleProps) {
  const [enabled, setEnabled] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setEnabled(next);
    startTransition(async () => {
      const { ok } = await setEmailPreference(topic, next);
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
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
