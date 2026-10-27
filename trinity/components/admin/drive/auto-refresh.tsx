"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Recharge la page à intervalle régulier (et au retour sur l'onglet) : les arrivées au drive
// s'affichent sans que l'équipe ait à recharger
export default function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);
  return null;
}
