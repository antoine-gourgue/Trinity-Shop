import Image from "next/image";
import { cn } from "@/lib/utils";

const GRADES = ["A", "B", "C", "D", "E"];

interface NutriScoreProps {
  grade?: string | null;
  className?: string;
}

export default function NutriScore({ grade, className }: NutriScoreProps) {
  const value = grade?.toUpperCase();
  if (!value || !GRADES.includes(value)) return null;

  return (
    <Image
      src={`/assets/nutri-score-${value}.png`}
      alt={`Nutri-Score ${value}`}
      width={68}
      height={36}
      className={cn("h-7 w-auto", className)}
    />
  );
}
