import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Utilisateur connecté de l'espace client : les pages s'appuient sur la session,
// jamais sur un identifiant passé dans l'URL
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  return session.user;
}

export function accountLinks(userId: string) {
  return {
    dashboard: `/user?userId=${userId}`,
    orders: `/user/${userId}/order`,
    info: `/user/info?userId=${userId}`,
    addresses: `/user/addresses?userId=${userId}`,
    phone: `/user/phone?userId=${userId}`,
  };
}

// Numéro de commande court et lisible à partir de l'identifiant
export function orderNumber(orderId: string) {
  return orderId.slice(-8).toUpperCase();
}
