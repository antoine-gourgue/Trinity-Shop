import { UsersCharts } from "@/components/admin/usersChart";
import prisma from "@/lib/prisma";

const StatUser = async () => {
    const users = await prisma.user.findMany();
    const lastUser = await prisma.user.findFirst({
        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <div className="h-screen border-l p-6 w-[400px]">
            <p className="font-bold uppercase">Nombre d'utilisateurs</p>
            <div className="flex flex-col items-center gap-4 p-10">
                <p className="text-4xl font-bold">{users.length}</p>
                <p className="text-sm text-slate-500">Utilisateurs</p>
            </div>
            <UsersCharts users={users} />
            <div className="flex flex-col gap-4 mt-10">
                <p className="font-bold uppercase">Dernier utilisateur</p>
                <div className="flex justify-start items-center gap-4">
                    <p>
                        {lastUser?.firstName} {lastUser?.lastName}
                    </p>
                    <p>{lastUser?.email}</p>
                </div>
            </div>
        </div>
    );
};

export default StatUser;
