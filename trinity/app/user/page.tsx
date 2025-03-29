import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShoppingCart, UserSquare } from "lucide-react";
import { getUserById } from "@/lib/server-actions/users-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function UserPage(props: any) {
    const rawSearchParams = await props.searchParams;
    const userId = rawSearchParams?.userId;

    if (!userId) {
        return notFound();
    }

    const user = await getUserById(userId);

    if (!user) {
        return <div className="text-center mt-10 text-gray-600">Utilisateur non trouvé.</div>;
    }

    return (
        <div className="min-h-screen flex flex-col overflow-hidden bg-gray-50">
            <div className="flex-1 overflow-auto">
                <div className="max-w-5xl lg:max-w-4xl xl:max-w-6xl mx-auto p-4 md:p-6 space-y-6">
                    <div className="border border-gray-300 shadow-sm rounded-lg p-6 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900">
                                {user.firstName} {user.lastName}
                            </h2>
                            <p className="text-lg text-gray-700">{user.email}</p>
                        </div>

                        <Button className="bg-teal-700 hover:bg-teal-800 text-white rounded-full px-6 py-3 text-base" asChild>
                            <Link href={`/user/info?userId=${userId}`}>Voir mes informations</Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border border-gray-300 shadow-sm rounded-lg p-4 bg-white">
                            <div className="flex items-center mb-4">
                                <UserSquare className="text-teal-700 mr-2" size={24} />
                                <h3 className="text-lg font-semibold">Mes coordonnées</h3>
                            </div>

                            <div className="space-y-2">
                                <Link
                                    href={`/user/addresses?userId=${userId}`}
                                    className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-100"
                                >
                                    Mes adresses
                                    <ArrowRight className="text-teal-700" size={18} />
                                </Link>

                                <Link
                                    href={`/user/phone?userId=${userId}`}
                                    className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-100"
                                >
                                    Mes numéros
                                    <ArrowRight className="text-teal-700" size={18} />
                                </Link>
                            </div>
                        </div>

                        <Link
                            href={`/user/${userId}/order`}
                            className="border border-gray-300 shadow-sm rounded-lg p-4 bg-white flex justify-between items-start hover:bg-gray-100"
                        >
                            <div>
                                <div className="flex items-center mb-2">
                                    <ShoppingCart className="text-teal-700 mr-2" size={24} />
                                    <h3 className="text-lg font-semibold">Mes commandes</h3>
                                </div>
                                <p className="text-gray-600">Retrouvez l'historique de vos commandes</p>
                            </div>
                            <ArrowRight className="text-teal-700" size={18} />
                        </Link>
                    </div>
                </div>
            </div>

            <footer className="bg-teal-700 text-white py-6">
                <div className="relative max-w-5xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 md:px-6">
                    <div className="absolute left-4 -top-3 bg-yellow-400 text-black px-2 py-1 text-sm font-bold shadow-md rounded-sm">
                        Plus d'options
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="bg-white text-black rounded-md p-4 space-y-2 shadow-sm">
                            <h4 className="text-lg font-semibold">Mes communications</h4>
                            <Link href="/legal/maintenance" className="text-teal-700 hover:underline block">
                                Mes canaux de communication
                            </Link>
                            <Link href="/legal/maintenance" className="text-teal-700 hover:underline block">
                                Mes préférences
                            </Link>
                        </div>

                        <div className="bg-white text-black rounded-md p-4 space-y-2 shadow-sm">
                            <h4 className="text-lg font-semibold">Réglementation</h4>
                            <Link href="/legal/privacy-policy" className="text-teal-700 hover:underline block">
                                Politique des fichiers
                            </Link>
                            <Link href="/legal/loyalty-program" className="text-teal-700 hover:underline block">
                                Conditions d'utilisation et de vente
                            </Link>
                            <Link href="/legal/mention-legal" className="text-teal-700 hover:underline block">
                                Mentions Légales
                            </Link>
                            <Link href="/legal/cookie" className="text-teal-700 hover:underline block">
                                Cookies
                            </Link>
                        </div>

                        <div className="bg-white text-black rounded-md p-4 space-y-2 shadow-sm">
                            <h4 className="text-lg font-semibold">FAQ / Contact</h4>
                            <Link href="/legal/faq" className="text-teal-700 hover:underline block">
                                FAQ
                            </Link>
                            <Link href="/legal/contact" className="text-teal-700 hover:underline block">
                                Contactez-nous
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
