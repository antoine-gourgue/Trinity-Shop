import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getUserOrders } from "@/lib/server-actions/users-actions";
import { requireUser } from "@/lib/account";
import { AccountHeader } from "@/components/account/account-ui";
import OrderCard from "@/components/account/order-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface UserOrdersPageProps {
    params: Promise<{ userId: string }>;
}

export default async function UserOrdersPage({ params }: UserOrdersPageProps) {
    const sessionUser = await requireUser();
    const { userId } = await params;

    // On ne montre que les commandes du compte connecté
    if (userId !== sessionUser.id) redirect(`/user/${sessionUser.id}/order`);

    const orders = await getUserOrders(sessionUser.id);

    return (
        <div>
            <AccountHeader
                title="Mes commandes"
                description={
                    orders.length > 0
                        ? `${orders.length} commande${orders.length > 1 ? "s" : ""}, de la plus récente à la plus ancienne.`
                        : undefined
                }
            />

            {orders.length > 0 ? (
                <ul className="space-y-4">
                    {orders.map((order) => (
                        <li key={order.id}>
                            <OrderCard href={`/user/${sessionUser.id}/order/${order.id}`} order={order} />
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-white px-6 py-14 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
                        <Package size={30} aria-hidden />
                    </span>
                    <p className="text-lg font-extrabold">Aucune commande pour le moment</p>
                    <p className="text-sm text-muted-foreground">Vos commandes validées apparaîtront ici.</p>
                    <Button asChild className="mt-2 rounded-full px-6 font-bold">
                        <Link href="/">Commencer mes courses</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
