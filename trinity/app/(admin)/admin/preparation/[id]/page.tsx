import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPreparation } from "@/lib/admin/queries";
import { backOfficePage } from "@/lib/admin/access";
import { orderNumber } from "@/lib/account";
import { RAYONS, findRayonForCategories } from "@/lib/rayons";
import { orderStatusLabel } from "@/lib/order-status";
import { formatBestBefore } from "@/lib/anti-gaspi";
import { lotLines } from "@/lib/lot-labels";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { customerName, pickupLabel } from "@/components/admin/admin-bits";
import PickingList, { type PickingLine } from "@/components/admin/preparation/picking-list";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Préparation #${orderNumber((await params).id)}` };
}

// Écran du préparateur : les articles de la commande, rayon par rayon, à prélever un à un
export default async function PreparationPage({ params }: Props) {
  const { store } = await backOfficePage();
  const order = await getPreparation((await params).id);
  // Une commande d'un autre magasin n'existe pas pour un compte magasin
  if (!order || (store && order.storeId !== store.id)) notFound();

  const delivery = !!order.shippingAddressId;
  // Articles dans l'ordre des rayons du magasin, pour un seul passage dans les allées
  const lines: PickingLine[] = order.cart.productsInCart
    .map((line) => {
      const match = findRayonForCategories(line.product.categories.map((category) => category.categoryName));
      return {
        id: line.id,
        quantity: line.quantity,
        preparedQuantity: line.preparedQuantity,
        allowSubstitute: line.allowSubstitute,
        substitute: line.substitute,
        product: {
          name: line.product.name,
          price: line.product.price,
          picture: line.product.picture,
          netContent: line.product.netContent,
          barCode: line.product.barCode.toString(),
          brand: line.product.brand.name,
        },
        antiGaspiDiscount: line.antiGaspiDiscount,
        lots: lotLines(line.lotAllocations),
        antiGaspi:
          line.antiGaspiQuantity > 0 && line.antiGaspiLot
            ? { quantity: line.antiGaspiQuantity, bestBefore: formatBestBefore(line.antiGaspiLot.bestBefore) }
            : null,
        rayon: match?.subCategory?.label ?? match?.rayon.shortName ?? "Autres rayons",
        rayonOrder: match ? RAYONS.indexOf(match.rayon) : RAYONS.length,
      };
    })
    .sort((a, b) => a.rayonOrder - b.rayonOrder || a.rayon.localeCompare(b.rayon) || a.product.name.localeCompare(b.product.name));

  return (
    <div className="pb-28">
      <AdminPageHeader
        back={{ href: "/admin/preparation", label: "File de préparation" }}
        title={`Préparation #${orderNumber(order.id)}`}
        description={[
          customerName(order.user),
          `${delivery ? "Livraison" : "Drive"} · ${order.pickupSlot ? pickupLabel(order.pickupSlot) : "sans créneau"}`,
          !store && order.store ? order.store.name : null,
          orderStatusLabel(order.status, delivery),
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <PickingList
        orderId={order.id}
        lines={lines}
        editable={order.status === "received" || order.status === "preparing"}
        refunded={order.preparationRefund}
      />
    </div>
  );
}
