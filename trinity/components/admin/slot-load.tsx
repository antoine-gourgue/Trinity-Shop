import { cn } from "@/lib/utils";

interface SlotLoadProps {
  days: { date: string; label: string; slots: { hour: number; count: number; rate: number }[] }[];
  capacity: number;
}

// Couleur d'un créneau selon son remplissage
function tone(rate: number) {
  if (rate >= 1) return "bg-promo text-white";
  if (rate >= 0.75) return "bg-highlight text-brand-dark";
  if (rate >= 0.4) return "bg-primary/70 text-white";
  if (rate > 0) return "bg-secondary text-primary";
  return "bg-muted/60 text-muted-foreground";
}

// Grille jours × heures : commandes réservées sur chaque créneau, sur la capacité
export default function SlotLoad({ days, capacity }: SlotLoadProps) {
  const hours = days[0]?.slots.map((slot) => slot.hour) ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="w-16" />
            {hours.map((hour) => (
              <th key={hour} scope="col" className="font-bold text-muted-foreground">
                {hour}h
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row" className="whitespace-nowrap pr-2 text-left font-bold capitalize">
                {day.label}
              </th>
              {day.slots.map((slot) => (
                <td
                  key={slot.hour}
                  title={`${day.label}, ${slot.hour}h : ${slot.count} commande${slot.count > 1 ? "s" : ""} sur ${capacity}`}
                  className={cn("h-9 rounded-lg font-bold tabular-nums", tone(slot.rate))}
                >
                  {slot.count || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Capacité : {capacity} commandes par créneau</span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-highlight" /> presque complet
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-promo" /> complet
        </span>
      </p>
    </div>
  );
}
