"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteCustomer, updateCustomer, type CustomerInput } from "@/lib/server-actions/admin-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ConfirmAction from "./confirm-action";

const ICON_BUTTON =
  "flex h-9 w-9 items-center justify-center rounded-full border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-primary";
const INPUT =
  "h-11 w-full rounded-2xl border bg-white px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";

const ROLES: { value: CustomerInput["role"]; label: string }[] = [
  { value: "Customer", label: "Client" },
  { value: "Seller", label: "Vendeur" },
  { value: "Admin", label: "Administrateur" },
];

export function EditCustomerButton({ userId, initial }: { userId: string; initial: CustomerInput }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) => setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCustomer(userId, { ...values, phone: values.phone?.trim() || null }).catch(() => ({
        ok: false as const,
        error: "L'enregistrement a échoué. Réessayez.",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast({ description: "Compte client mis à jour." });
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValues(initial);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button type="button" aria-label={`Modifier ${initial.firstName} ${initial.lastName}`} title="Modifier" className={ICON_BUTTON}>
          <Pencil size={16} aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Modifier le compte</DialogTitle>
          <DialogDescription>Identité, coordonnées et rôle de l’utilisateur.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Prénom
              <input value={values.firstName} onChange={(e) => set("firstName", e.target.value)} className={cn(INPUT, "mt-1.5")} required />
            </label>
            <label className="text-sm font-bold">
              Nom
              <input value={values.lastName} onChange={(e) => set("lastName", e.target.value)} className={cn(INPUT, "mt-1.5")} required />
            </label>
          </div>
          <label className="block text-sm font-bold">
            E-mail
            <input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} className={cn(INPUT, "mt-1.5")} required />
          </label>
          <label className="block text-sm font-bold">
            Téléphone
            <input value={values.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="Non renseigné" className={cn(INPUT, "mt-1.5")} />
          </label>
          <fieldset>
            <legend className="text-sm font-bold">Rôle</legend>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => set("role", role.value)}
                  aria-pressed={values.role === role.value}
                  className={cn(
                    "h-11 rounded-2xl border text-sm font-bold transition-colors",
                    values.role === role.value ? "border-primary bg-secondary text-primary" : "bg-white hover:border-primary"
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </fieldset>
          {error && <p className="rounded-2xl bg-promo/10 px-4 py-3 text-sm font-semibold text-promo">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 rounded-full border px-5 text-sm font-bold transition-colors hover:border-primary hover:text-primary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {isPending && <Loader2 size={16} className="animate-spin" aria-hidden />}
              Enregistrer
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCustomerButton({ userId, name, orders }: { userId: string; name: string; orders: number }) {
  return (
    <ConfirmAction
      trigger={
        <button type="button" aria-label={`Supprimer ${name}`} title="Supprimer" className={cn(ICON_BUTTON, "hover:border-promo hover:text-promo")}>
          <Trash2 size={16} aria-hidden />
        </button>
      }
      title={`Supprimer le compte de ${name} ?`}
      description={
        orders > 0
          ? `Le compte sera supprimé avec ses adresses, ses paniers et ses ${orders} commande${orders > 1 ? "s" : ""}. Cette action est définitive.`
          : "Le compte sera supprimé avec ses adresses et ses paniers. Cette action est définitive."
      }
      confirmLabel="Supprimer le compte"
      successMessage="Compte supprimé."
      action={() => deleteCustomer(userId)}
    />
  );
}
