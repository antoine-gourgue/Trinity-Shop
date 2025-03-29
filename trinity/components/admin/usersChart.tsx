"use client";

import { Bar, BarChart } from "recharts";
import {
    eachMonthOfInterval,
    endOfMonth,
    isWithinInterval,
    subMonths,
} from "date-fns";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { User } from "@prisma/client";

const chartConfig = {
    desktop: {
        label: "Nouveaux utilisateurs",
        color: "#2563eb",
    },
} satisfies ChartConfig;

interface Props {
    users: User[];
}

function getNumberOfUsersPerMonth(users: User[], dateOfMonth: Date) {
    const usersInMonth = [];

    users.forEach((user) => {
        if (
            isWithinInterval(new Date(user.createdAt), {
                start: dateOfMonth,
                end: endOfMonth(dateOfMonth),
            })
        ) {
            usersInMonth.push(user);
        }
    });

    return usersInMonth.length;
}

function getUsersData(users: User[]) {
    const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date(),
    });
    const usersPerMonth = months.map((firstDayOfMonth) => {
        return {
            date: firstDayOfMonth.toLocaleDateString("fr-FR", { month: "long" }),
            desktop: getNumberOfUsersPerMonth(users, firstDayOfMonth),
        };
    });

    return usersPerMonth;
}

export function UsersCharts({ users }: Props) {
    return (
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <BarChart accessibilityLayer data={getUsersData(users)}>
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            </BarChart>
        </ChartContainer>
    );
}
