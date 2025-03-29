import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function getUser() {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
        console.error("Aucun utilisateur connecté.");
        return null;
    }

    // Recherche l'utilisateur par email dans la base de données
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, firstName: true },
    });

    if (!user) {
        console.error("Utilisateur non trouvé en base de données.");
        return null;
    }

    return user; // Retourne l'utilisateur avec son ID
}
