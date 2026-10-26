import { notFound } from "next/navigation";
import { Home, Truck } from "lucide-react";
import { getUserWithAddresses } from "@/lib/server-actions/users-actions";
import { requireUser } from "@/lib/account";
import { AccountCard, AccountHeader } from "@/components/account/account-ui";
import AddAddressModal from "@/app/user/modal/AddAddressModal";
import EditAddressModal from "@/app/user/modal/EditAddressModal";
import DeleteAddressModal from "@/app/user/modal/DeleteAddressModal";

export const dynamic = "force-dynamic";

const ADDRESS_TYPES = [
    {
        type: "domicile" as const,
        title: "Adresse de domicile",
        hint: "Utilisée pour vos factures.",
        icon: Home,
    },
    {
        type: "livraison" as const,
        title: "Adresse de livraison",
        hint: "Utilisée pour la livraison à domicile.",
        icon: Truck,
    },
];

export default async function UserAddressesPage() {
    const sessionUser = await requireUser();
    const user = await getUserWithAddresses(sessionUser.id);
    if (!user) return notFound();

    return (
        <div>
            <AccountHeader title="Mes adresses" description="Gérez vos adresses de facturation et de livraison." />

            <div className="grid gap-6 xl:grid-cols-2">
                {ADDRESS_TYPES.map(({ type, title, hint, icon: Icon }) => {
                    const address = user.addresses.find((addr) => addr.type === type);

                    return (
                        <AccountCard key={type} title={title} icon={<Icon size={18} aria-hidden />}>
                            {address ? (
                                <>
                                    <address className="not-italic leading-relaxed">
                                        <span className="block font-bold">
                                            {user.firstName} {user.lastName}
                                        </span>
                                        {address.street}
                                        <br />
                                        {address.zipCode} {address.city}
                                        <br />
                                        {address.country}
                                    </address>
                                    <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                                        <EditAddressModal address={address} />
                                        <DeleteAddressModal addressId={address.id} />
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed p-5">
                                    <p className="text-sm text-muted-foreground">
                                        Aucune adresse enregistrée. {hint}
                                    </p>
                                    <AddAddressModal userId={user.id} defaultType={type} />
                                </div>
                            )}
                        </AccountCard>
                    );
                })}
            </div>
        </div>
    );
}
