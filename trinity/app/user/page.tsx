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
        <div className="flex flex-col">
            <div className="flex-1 overflow-auto">
                <div className="max-w-5xl lg:max-w-4xl xl:max-w-6xl mx-auto p-4 md:p-6 space-y-6">
                    <div className="border rounded-2xl p-6 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900">
                                {user.firstName} {user.lastName}
                            </h2>
                            <p className="text-lg text-gray-700">{user.email}</p>
                        </div>

                        <Button className="rounded-full px-6 font-bold" asChild>
                            <Link href={`/user/info?userId=${userId}`}>Voir mes informations</Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border rounded-2xl p-4 bg-white">
                            <div className="flex items-center mb-4">
                                <UserSquare className="text-primary mr-2" size={24} />
                                <h3 className="text-lg font-semibold">Mes coordonnées</h3>
                            </div>

                            <div className="space-y-2">
                                <Link
                                    href={`/user/addresses?userId=${userId}`}
                                    className="flex items-center justify-between border rounded-xl px-4 py-2.5 font-semibold hover:bg-muted"
                                >
                                    Mes adresses
                                    <ArrowRight className="text-primary" size={18} />
                                </Link>

                                <Link
                                    href={`/user/phone?userId=${userId}`}
                                    className="flex items-center justify-between border rounded-xl px-4 py-2.5 font-semibold hover:bg-muted"
                                >
                                    Mes numéros
                                    <ArrowRight className="text-primary" size={18} />
                                </Link>
                            </div>
                        </div>

                        <Link
                            href={`/user/${userId}/order`}
                            className="border rounded-2xl p-4 bg-white flex justify-between items-start hover:bg-muted"
                        >
                            <div>
                                <div className="flex items-center mb-2">
                                    <ShoppingCart className="text-primary mr-2" size={24} />
                                    <h3 className="text-lg font-semibold">Mes commandes</h3>
                                </div>
                                <p className="text-gray-600">Retrouvez l’historique de vos commandes</p>
                            </div>
                            <ArrowRight className="text-primary" size={18} />
                        </Link>
                    </div>

                    <section>
                        <h3 className="mb-3 text-lg font-black">Plus d’options</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-2 rounded-2xl border bg-white p-5">
                                <h4 className="font-extrabold">Mes communications</h4>
                                <Link href="/legal/maintenance" className="block text-sm text-primary hover:underline">
                                    Mes canaux de communication
                                </Link>
                                <Link href="/legal/maintenance" className="block text-sm text-primary hover:underline">
                                    Mes préférences
                                </Link>
                            </div>
                            <div className="space-y-2 rounded-2xl border bg-white p-5">
                                <h4 className="font-extrabold">Réglementation</h4>
                                <Link href="/legal/privacy-policy" className="block text-sm text-primary hover:underline">
                                    Politique des fichiers
                                </Link>
                                <Link href="/legal/loyalty-program" className="block text-sm text-primary hover:underline">
                                    Conditions d’utilisation et de vente
                                </Link>
                                <Link href="/legal/mention-legal" className="block text-sm text-primary hover:underline">
                                    Mentions Légales
                                </Link>
                                <Link href="/legal/cookie" className="block text-sm text-primary hover:underline">
                                    Cookies
                                </Link>
                            </div>
                            <div className="space-y-2 rounded-2xl border bg-white p-5">
                                <h4 className="font-extrabold">FAQ / Contact</h4>
                                <Link href="/legal/faq" className="block text-sm text-primary hover:underline">
                                    FAQ
                                </Link>
                                <Link href="/legal/contact" className="block text-sm text-primary hover:underline">
                                    Contactez-nous
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

        </div>
    );
}
