import { notFound } from "next/navigation";
import { getUserWithAddresses } from "@/lib/server-actions/users-actions";
import Link from "next/link";

import AddAddressModal from "@/app/user/modal/AddAddressModal";
import EditAddressModal from "@/app/user/modal/EditAddressModal";
import DeleteAddressModal from "@/app/user/modal/DeleteAddressModal";

export default async function UserAddressesPage(props: any) {
    const raw = await props.searchParams;
    const userId = raw?.userId;

    if (!userId) return notFound();

    const user = await getUserWithAddresses(userId);
    if (!user) return notFound();

    const domicileAddress = user.addresses.find((addr) => addr.type === "domicile");
    const livraisonAddress = user.addresses.find((addr) => addr.type === "livraison");

    return (
        <div className="max-w-6xl mx-auto p-6 bg-gray-50 space-y-6">
            <nav className="text-sm text-gray-600 mb-4">
                <Link href={`/user?userId=${user.id}`} className="hover:underline">
                    Mon espace
                </Link>{" "}
                &gt;{" "}
                <Link href={`/user/info?userId=${user.id}`} className="hover:underline">
                    Mes informations
                </Link>{" "}
                &gt; <span className="text-teal-700">Mes adresses</span>
            </nav>

            <h1 className="text-3xl font-bold text-gray-900">Mes adresses</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-300 rounded-lg p-4 bg-white relative">
                    <h2 className="font-semibold text-gray-800 mb-2">Adresse de domicile</h2>

                    {domicileAddress ? (
                        <>
                            <div className="absolute top-2 right-2">
                                <DeleteAddressModal addressId={domicileAddress.id} />
                            </div>

                            <p className="text-gray-700">{domicileAddress.street}</p>
                            <p className="text-gray-700">
                                {domicileAddress.zipCode} {domicileAddress.city}
                            </p>
                            <p className="text-gray-700">{domicileAddress.country}</p>

                            <div className="mt-3">
                                <EditAddressModal address={domicileAddress} />
                            </div>
                        </>
                    ) : (
                        <AddAddressModal userId={user.id} defaultType="domicile" />
                    )}
                </div>

                <div className="border border-gray-300 rounded-lg p-4 bg-white relative">
                    <h2 className="font-semibold text-gray-800 mb-2">Adresse de livraison</h2>

                    {livraisonAddress ? (
                        <>
                            <div className="absolute top-2 right-2">
                                <DeleteAddressModal addressId={livraisonAddress.id} />
                            </div>

                            <p className="text-gray-700">{livraisonAddress.street}</p>
                            <p className="text-gray-700">
                                {livraisonAddress.zipCode} {livraisonAddress.city}
                            </p>
                            <p className="text-gray-700">{livraisonAddress.country}</p>

                            <div className="mt-3">
                                <EditAddressModal address={livraisonAddress} />
                            </div>
                        </>
                    ) : (
                        <AddAddressModal userId={user.id} defaultType="livraison" />
                    )}
                </div>
            </div>
        </div>
    );
}
