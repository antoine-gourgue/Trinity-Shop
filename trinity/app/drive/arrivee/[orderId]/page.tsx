import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Clock, TriangleAlert } from "lucide-react";
import prisma from "@/lib/prisma";
import { orderNumber } from "@/lib/account";
import { formatPickupDate } from "@/lib/checkout";
import { canCheckIn } from "@/lib/drive";
import { isValidArrivalSignature } from "@/lib/drive-links";
import DriveCheckIn from "@/components/account/drive-check-in";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Arrivée au drive — Trinity", robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ s?: string }>;
}

function Message({ icon: Icon, title, text }: { icon: typeof Clock; title: string; text: string }) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon size={26} aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl font-black">{title}</h1>
      <p className="mt-2 text-muted-foreground">{text}</p>
      <Link href="/" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-brand-dark">
        Retour à la boutique
      </Link>
    </div>
  );
}

// Lien « Je suis arrivé » de l'e-mail « commande prête » : il marche sans connexion
export default async function DriveArrivalPage({ params, searchParams }: Props) {
  const [{ orderId }, { s: signature }] = await Promise.all([params, searchParams]);
  if (!signature || !isValidArrivalSignature(orderId, signature)) {
    return <Message icon={TriangleAlert} title="Lien invalide" text="Ce lien d'arrivée n'est pas valable. Retrouvez votre commande dans votre espace client." />;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      shippingAddressId: true,
      pickupSlot: true,
      arrivedAt: true,
      parkingSpot: true,
      store: { select: { name: true } },
      user: { select: { firstName: true } },
      cart: { select: { productsInCart: { select: { quantity: true } } } },
    },
  });
  if (!order) return <Message icon={TriangleAlert} title="Commande introuvable" text="Cette commande n'existe plus." />;
  if (order.status === "completed") {
    return <Message icon={CircleCheck} title="Courses remises" text="Vos courses vous ont été remises. Merci et à très vite sur Trinity !" />;
  }
  if (!canCheckIn(order)) {
    return (
      <Message
        icon={Clock}
        title="Pas encore prête"
        text={
          order.status === "cancelled"
            ? "Cette commande a été annulée."
            : "Vos courses sont en cours de préparation : nous vous écrirons dès qu'elles vous attendront au drive."
        }
      />
    );
  }

  const articles = order.cart.productsInCart.reduce((total, line) => total + line.quantity, 0);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Commande n° {orderNumber(order.id)}</p>
        <h1 className="mt-1 text-2xl font-black">Bonjour {order.user.firstName} !</h1>
        <p className="mt-1 text-muted-foreground">
          {articles} article{articles > 1 ? "s" : ""} prêt{articles > 1 ? "s" : ""} au drive {order.store?.name ?? "Trinity"}
          {order.pickupSlot ? ` · ${formatPickupDate(order.pickupSlot)}` : ""}
        </p>
      </div>
      <DriveCheckIn
        orderId={order.id}
        storeName={order.store?.name ?? "Trinity"}
        arrivedAt={order.arrivedAt?.toISOString() ?? null}
        parkingSpot={order.parkingSpot}
        signature={signature}
      />
    </div>
  );
}
