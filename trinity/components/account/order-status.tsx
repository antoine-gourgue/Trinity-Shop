import { CircleCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrderStatus({ validated, className }: { validated: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold",
        validated ? "bg-bio/10 text-bio" : "bg-highlight/30 text-brand-dark",
        className
      )}
    >
      {validated ? <CircleCheck size={14} aria-hidden /> : <Clock size={14} aria-hidden />}
      {validated ? "Validée" : "En attente"}
    </span>
  );
}
