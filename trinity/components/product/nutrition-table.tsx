import { Minus, Plus } from "lucide-react";

interface NutritionTableProps {
  rows: { label: string; value: string }[];
}

// Tableau « Pour 100 g » repliable, lignes alternées
export default function NutritionTable({ rows }: NutritionTableProps) {
  return (
    <details open className="group overflow-hidden rounded-xl">
      <summary className="flex cursor-pointer list-none items-center justify-between bg-brand-dark px-5 py-3.5 text-base font-bold text-white [&::-webkit-details-marker]:hidden">
        Pour 100 g
        <Minus size={18} className="hidden group-open:block" aria-hidden />
        <Plus size={18} className="group-open:hidden" aria-hidden />
      </summary>
      <table className="w-full text-[15px]">
        <caption className="sr-only">Valeurs nutritionnelles pour 100 g</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="even:bg-muted">
              <th scope="row" className="px-5 py-3 text-left font-semibold md:px-8">
                {row.label}
              </th>
              <td className="px-5 py-3 text-right tabular-nums md:px-8">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
