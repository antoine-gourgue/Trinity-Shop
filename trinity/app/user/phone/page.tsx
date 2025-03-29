import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PhoneModal from "@/app/user/modal/PhoneModal";

export default async function UserPhonePage(props: any) {
    const { userId } = ((await props.searchParams) ?? {}) as { userId?: string };

    if (!userId) return notFound();

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            phone: true,
        },
    });

    if (!user) return notFound();

    return (
        <div className="max-w-6xl mx-auto p-6 bg-gray-50 space-y-6">
            <nav className="text-sm text-gray-600 mb-4">
                <Link
                    href={`/user?userId=${user.id}`}
                    className=" hover:underline"
                >
                    Mon espace
                </Link>
                {" "} &gt; {" "}
                <Link
                    href={`/user/info?userId=${user.id}`}
                    className="text-teal-700 hover:underline"
                >
                    Mes informations
                </Link>
                {" "} &gt; {" "}
                <span className="text-teal-700">Mes numéros de téléphone</span>
            </nav>

            <h1 className="text-3xl font-bold text-gray-900">Mes numéros de téléphone</h1>

            <div className="border border-gray-300 rounded-lg p-4 bg-white relative max-w-md">
                <h2 className="font-semibold text-gray-800">Mon numéro principal</h2>

                {user.phone ? (
                    <p className="text-gray-700 mt-1 text-xl">{user.phone}</p>
                ) : (
                    <div className="flex items-center text-teal-700 mt-3 group">
                        <span className="text-gray-600">
              Aucun numéro enregistré
            </span>
                    </div>
                )}

                <PhoneModal userId={user.id} currentPhone={user.phone} />
            </div>
        </div>
    );
}
