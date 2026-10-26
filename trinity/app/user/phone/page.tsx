import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { requireUser } from "@/lib/account";
import { AccountCard, AccountHeader } from "@/components/account/account-ui";
import PhoneModal from "@/app/user/modal/PhoneModal";

export const dynamic = "force-dynamic";

// Numéro stocké sans espaces par react-phone-input-2 (ex. 33612345678)
function formatPhone(phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("33") && digits.length === 11) {
        return `+33 ${digits.slice(2).replace(/(\d)(?=(\d{2})+$)/g, "$1 ")}`;
    }
    return /^\d+$/.test(phone) ? `+${phone}` : phone;
}

export default async function UserPhonePage() {
    const sessionUser = await requireUser();
    const user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, phone: true },
    });
    if (!user) return notFound();

    return (
        <div>
            <AccountHeader
                title="Mon téléphone"
                description="Le numéro de téléphone associé à votre compte."
            />

            <AccountCard title="Numéro principal" icon={<Phone size={18} aria-hidden />} className="max-w-xl">
                {user.phone ? (
                    <p className="text-2xl font-black tracking-wide">{formatPhone(user.phone)}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">Aucun numéro enregistré pour le moment.</p>
                )}
                <PhoneModal userId={user.id} currentPhone={user.phone} />
            </AccountCard>
        </div>
    );
}
