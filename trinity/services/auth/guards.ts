import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// Contrôles d'accès des server actions et des routes API.
// L'identité vient toujours de la session, jamais d'un identifiant envoyé par le
// navigateur, et le rôle est relu en base pour qu'un changement s'applique tout de suite.

export class AccessDeniedError extends Error {
  constructor(message = "Accès refusé.") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

// Utilisateur connecté, ou null
export async function currentAccess() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } });
  return user ? { id: user.id, isAdmin: user.role === "Admin" } : null;
}

export async function isAdmin() {
  return !!(await currentAccess())?.isAdmin;
}

// Le compte visé est celui de l'utilisateur connecté, ou l'utilisateur est administrateur
export async function canAccessUser(userId: string) {
  const access = await currentAccess();
  return !!access && (access.isAdmin || access.id === userId);
}

async function ownerOrAdmin(find: () => Promise<{ userId: string } | null>) {
  const access = await currentAccess();
  if (!access) return false;
  if (access.isAdmin) return true;
  const resource = await find();
  return resource?.userId === access.id;
}

export function canAccessOrder(orderId: string) {
  return ownerOrAdmin(() => prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } }));
}

export function canAccessCart(cartId: string) {
  return ownerOrAdmin(() => prisma.cart.findUnique({ where: { id: cartId }, select: { userId: true } }));
}

export function canAccessAddress(addressId: string) {
  return ownerOrAdmin(() => prisma.address.findUnique({ where: { id: addressId }, select: { userId: true } }));
}

// Versions qui lèvent une erreur, pour les server actions
async function ensure(allowed: Promise<boolean>) {
  if (!(await allowed)) throw new AccessDeniedError();
}

export const requireAdmin = () => ensure(isAdmin());
export const requireUserAccess = (userId: string) => ensure(canAccessUser(userId));
export const requireOrderAccess = (orderId: string) => ensure(canAccessOrder(orderId));
export const requireAddressAccess = (addressId: string) => ensure(canAccessAddress(addressId));
