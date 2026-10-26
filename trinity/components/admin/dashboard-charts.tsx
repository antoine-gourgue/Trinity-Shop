"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// Nombre de commandes du jour survolé (recharts type le point de données en any)
function ordersOf(point: unknown) {
  return typeof point === "object" && point !== null && "orders" in point && typeof point.orders === "number" ? point.orders : 0;
}

const revenueConfig = {
  total: { label: "Chiffre d'affaires", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

export function RevenueChart({ data }: { data: { label: string; total: number; orders: number }[] }) {
  return (
    <ChartContainer config={revenueConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value: number) => euro.format(value)} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => {
                const orders = ordersOf(item.payload);
                return (
                  <span className="font-bold">
                    {euro.format(Number(value))} · {orders} commande{orders > 1 ? "s" : ""}
                  </span>
                );
              }}
            />
          }
        />
        <Area dataKey="total" type="monotone" stroke="var(--color-total)" strokeWidth={2.5} fill="url(#revenue-fill)" />
      </AreaChart>
    </ChartContainer>
  );
}

const signupsConfig = {
  count: { label: "Inscriptions", color: "hsl(var(--highlight))" },
} satisfies ChartConfig;

export function SignupsChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ChartContainer config={signupsConfig} className="aspect-auto h-48 w-full">
      <BarChart data={data} margin={{ left: 0, right: 0, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
