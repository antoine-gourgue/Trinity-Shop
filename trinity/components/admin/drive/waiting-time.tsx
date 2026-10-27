"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Attente au-delà de laquelle le client est signalé en rouge
const LONG_WAIT_MINUTES = 5;

// Temps écoulé depuis l'arrivée du client, mis à jour toutes les 15 secondes
export default function WaitingTime({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000));
  return (
    <span suppressHydrationWarning className={cn("font-black tabular-nums", minutes >= LONG_WAIT_MINUTES ? "text-promo" : "text-brand-dark")}>
      {minutes < 1 ? "à l'instant" : `depuis ${minutes} min`}
    </span>
  );
}
