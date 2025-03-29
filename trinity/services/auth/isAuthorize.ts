import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export default async function isAuthorize(role: Role = "Customer") {
    const session = await auth();

    if (!session?.user) return false;

    const user = await prisma.user.findUnique({
        where: {
            email: session.user.email,
        },
        select: {
            role: true,
        },
    });

    if (role === "Admin" && user?.role !== "Admin") return false;

    return true;
}
