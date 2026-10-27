"use client";

import { useState, useTransition } from "react";
import { Loader2, MailWarning } from "lucide-react";
import { resendVerificationEmail } from "@/lib/server-actions/email-verification-actions";

// Bandeau de l'espace client tant que l'adresse e-mail n'est pas confirmée
export default function VerifyEmailBanner({ email }: { email: string }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const resend = () => {
    startTransition(async () => {
      const result = await resendVerificationEmail();
      setMessage(result.ok ? { ok: true, text: `E-mail envoyé à ${email}.` } : { ok: false, text: result.error });
    });
  };

  return (
    <div role="status" className="mb-6 flex flex-wrap items-center gap-4 rounded-3xl border border-highlight bg-highlight/15 p-4 md:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-highlight text-brand-dark">
        <MailWarning size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">Confirmez votre adresse e-mail</p>
        <p className="text-sm text-muted-foreground">
          Cliquez sur le lien envoyé à <span className="font-semibold text-foreground">{email}</span>. Sans confirmation, vous ne
          recevez ni rappels de panier ni alertes promo.
        </p>
        {message && <p className={message.ok ? "mt-1 text-sm font-bold text-bio" : "mt-1 text-sm font-bold text-destructive"}>{message.text}</p>}
      </div>
      <button
        type="button"
        onClick={resend}
        disabled={isPending}
        className="flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary disabled:opacity-60"
      >
        {isPending && <Loader2 size={16} className="animate-spin" aria-hidden />}
        Renvoyer l’e-mail
      </button>
    </div>
  );
}
