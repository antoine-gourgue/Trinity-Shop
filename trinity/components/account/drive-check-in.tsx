"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, Loader2 } from "lucide-react";
import { checkIn } from "@/lib/server-actions/drive-actions";
import { DRIVE_SPOTS } from "@/lib/drive";
import { cn } from "@/lib/utils";

interface DriveCheckInProps {
  orderId: string;
  storeName: string;
  // Arrivée déjà signalée (date ISO) et place choisie
  arrivedAt: string | null;
  parkingSpot: number | null;
  // Lien signé de l'e-mail, pour un client qui n'est pas connecté
  signature?: string;
}

// « Je suis arrivé » : le client choisit la place où il s'est garé, l'équipe du drive lui apporte ses courses
export default function DriveCheckIn({ orderId, storeName, arrivedAt, parkingSpot, signature }: DriveCheckInProps) {
  const router = useRouter();
  const [spot, setSpot] = useState<number | null>(parkingSpot);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!spot) return;
    setError(null);
    startTransition(async () => {
      const result = await checkIn(orderId, spot, signature);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setChanging(false);
      router.refresh();
    });
  };

  if (arrivedAt && !changing) {
    const time = new Date(arrivedAt).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
    return (
      <section className="rounded-3xl bg-bio p-5 text-white md:p-6" aria-live="polite">
        <p className="flex items-center gap-2 text-lg font-black">
          <CheckCircle2 size={24} aria-hidden /> C’est noté, nous arrivons !
        </p>
        <p className="mt-1 text-white/90">
          Place n° <span className="font-black">{parkingSpot}</span> · arrivée signalée à {time}. Un équipier du drive {storeName} vous
          apporte vos courses, restez dans votre véhicule.
        </p>
        <button type="button" onClick={() => setChanging(true)} className="mt-3 text-sm font-bold underline underline-offset-2">
          Vous avez changé de place ?
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border-2 border-primary bg-white p-5 md:p-6">
      <h2 className="flex items-center gap-2 text-lg font-black">
        <Car size={22} className="text-primary" aria-hidden />
        {arrivedAt ? "Votre nouvelle place" : "Vous êtes arrivé au drive ?"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Garez-vous sur une place drive numérotée du magasin {storeName}, indiquez-la ci-dessous : un équipier vous apporte vos
        courses.
      </p>
      <div role="radiogroup" aria-label="Place sur le parking drive" className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-12">
        {Array.from({ length: DRIVE_SPOTS }, (_, index) => index + 1).map((number) => (
          <button
            key={number}
            type="button"
            role="radio"
            aria-checked={spot === number}
            aria-label={`Place ${number}`}
            onClick={() => setSpot(number)}
            className={cn(
              "flex h-12 items-center justify-center rounded-2xl border text-lg font-black transition-colors",
              spot === number ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:text-primary"
            )}
          >
            {number}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 rounded-2xl bg-promo/10 px-4 py-3 text-sm font-semibold text-promo">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={!spot || pending}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Car size={18} aria-hidden />}
        {spot ? `Je suis arrivé, place n° ${spot}` : "Choisissez votre place"}
      </button>
    </section>
  );
}
