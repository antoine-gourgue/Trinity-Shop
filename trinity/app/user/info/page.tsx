import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getUserDetails } from "@/lib/server-actions/users-actions";
import EditEmailModal from "../modal/EditEmailModal";
import EditPasswordModal from "../modal/EditPasswordModal";
import DeleteUserModal from "@/app/user/modal/DeleteUserModal";

export const dynamic = "force-dynamic";

export default async function UserDetailsPage(props: any) {
    const rawSearchParams = await props.searchParams;
    const userId = rawSearchParams?.userId;

    if (!userId) {
        return notFound();
    }

    const userData = await getUserDetails(userId);
    if (!userData) {
        return notFound();
    }

    const user = {
        ...userData,
        birthDate: userData.birthDate
            ? new Date(userData.birthDate).toISOString().split("T")[0]
            : null,
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-gray-50 space-y-6">
            <nav className="text-sm text-gray-600 mb-4">
                <Link href={`/user?userId=${user.id}`} className="hover:underline">
                    Mon espace
                </Link>{" "}
                &gt; <span className="text-teal-700">Mes informations</span>
            </nav>

            <h1 className="text-3xl font-bold text-gray-900">Mes informations</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-300 rounded-lg p-4 bg-white space-y-2">
                    <h3 className="font-semibold text-gray-800">Civilité</h3>
                    <p className="text-gray-700">
                        M {user.lastName} {user.firstName}
                    </p>

                    <h3 className="font-semibold text-gray-800 mt-4">Date de naissance</h3>
                    <p className="text-gray-700">{user.birthDate ?? "**/**/****"}</p>
                </div>

                <div className="border border-gray-300 rounded-lg p-4 bg-white flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-gray-800">Adresse e-mail</h3>
                        <p className="text-gray-700">{user.email}</p>
                    </div>
                    <EditEmailModal userId={user.id} currentEmail={user.email} />
                </div>

                <div className="border border-gray-300 rounded-lg p-4 bg-white flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-gray-800">Mot de passe</h3>
                        <p className="text-gray-700">*********</p>
                    </div>
                    <EditPasswordModal userId={user.id} />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-900 mt-6">Mes coordonnées</h2>
                <div className="space-y-4 mt-4">
                    <Link
                        href={`/user/addresses?userId=${user.id}`}
                        className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-100"
                    >
                        Mes adresses
                        <ArrowRight className="text-teal-700" size={18} />
                    </Link>
                    <Link
                        href={`/user/phone?userId=${user.id}`}
                        className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-100"
                    >
                        Mes numéros
                        <ArrowRight className="text-teal-700" size={18} />
                    </Link>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900">
                    Suppression du Compte Trinity
                </h2>
                <DeleteUserModal userId={user.id} />
            </div>
        </div>
    );
}
