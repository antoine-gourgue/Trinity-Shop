"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getLoyaltySummary } from "@/lib/server-actions/loyalty-actions";

// Carte Trinity du client connecté : undefined pendant le chargement, null sans carte
export function useLoyalty() {
  const { status } = useSession();
  const [loyalty, setLoyalty] = useState<{ number: string; points: number } | null | undefined>(undefined);

  const reload = useCallback(() => {
    getLoyaltySummary().then(setLoyalty);
  }, []);

  useEffect(() => {
    if (status === "authenticated") reload();
  }, [status, reload]);

  return { loyalty, reload };
}
