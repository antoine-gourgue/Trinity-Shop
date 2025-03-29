import { User, columns } from "@/app/(admin)/admin/users/columns";
import { DataTable } from "@/app/(admin)/admin/users/data-table";

import prisma from "@/lib/prisma";
import StatUser from "./users/stat";

async function getData(): Promise<User[]> {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        return users;
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

export default async function UsersPage() {
    const data = await getData();

    return (
        <div className="w-full flex h-screen overflow-y-hidden">
            <DataTable columns={columns} data={data} />
            <StatUser />
        </div>
    );
}
