import { notFound } from "next/navigation";
import { KeyRound, ShieldAlert, UserRound } from "lucide-react";
import { getUserDetails } from "@/lib/server-actions/users-actions";
import { requireUser } from "@/lib/account";
import { AccountCard, AccountHeader, InfoRow } from "@/components/account/account-ui";
import EditEmailModal from "../modal/EditEmailModal";
import EditPasswordModal from "../modal/EditPasswordModal";
import DeleteUserModal from "@/app/user/modal/DeleteUserModal";

export const dynamic = "force-dynamic";

export default async function UserDetailsPage() {
    const sessionUser = await requireUser();
    const user = await getUserDetails(sessionUser.id);
    if (!user) return notFound();

    const birthDate = user.birthDate
        ? new Date(user.birthDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
        : "Non renseignée";

    return (
        <div>
            <AccountHeader
                title="Mes informations"
                description="Vos informations personnelles et vos identifiants de connexion."
            />

            <div className="grid gap-6 xl:grid-cols-2">
                <AccountCard title="Identité" icon={<UserRound size={18} aria-hidden />}>
                    <div className="divide-y">
                        <InfoRow label="Prénom" value={user.firstName} />
                        <InfoRow label="Nom" value={user.lastName} />
                        <InfoRow label="Date de naissance" value={birthDate} />
                    </div>
                </AccountCard>

                <AccountCard title="Identifiants de connexion" icon={<KeyRound size={18} aria-hidden />}>
                    <div className="divide-y">
                        <InfoRow
                            label="Adresse e-mail"
                            value={user.email}
                            action={<EditEmailModal userId={user.id} currentEmail={user.email} />}
                        />
                        <InfoRow
                            label="Mot de passe"
                            value="••••••••••"
                            action={<EditPasswordModal userId={user.id} />}
                        />
                    </div>
                </AccountCard>
            </div>

            <AccountCard
                title="Supprimer mon compte"
                icon={<ShieldAlert size={18} aria-hidden />}
                className="mt-6 border-destructive/20"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="max-w-xl text-sm text-muted-foreground">
                        La suppression de votre compte Trinity est définitive : vos informations, adresses et
                        commandes ne pourront pas être récupérées.
                    </p>
                    <DeleteUserModal userId={user.id} />
                </div>
            </AccountCard>
        </div>
    );
}
