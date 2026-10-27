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

// Utilisateur connecté, ou null ; un compte magasin indique le magasin qu'il gère
export async function currentAccess() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, storeId: true } });
  if (!user) return null;
  return { id: user.id, isAdmin: user.role === "Admin", managedStoreId: user.role === "StoreManager" ? user.storeId : null };
}

// Accès au back-office : le siège (administrateur) voit tout le réseau, un compte magasin son seul magasin
export type BackOfficeAccess = { userId: string; store: { id: string; slug: string; name: string } | null };

export async function backOfficeAccess(): Promise<BackOfficeAccess | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, store: { select: { id: true, slug: true, name: true } } },
  });
  if (user?.role === "Admin") return { userId: user.id, store: null };
  if (user?.role === "StoreManager" && user.store) return { userId: user.id, store: user.store };
  return null;
}

export async function requireBackOffice(): Promise<BackOfficeAccess> {
  const access = await backOfficeAccess();
  if (!access) throw new AccessDeniedError();
  return access;
}

// Commande gérée : toutes pour le siège, celles de son magasin pour un compte magasin
export async function requireOrderManagement(orderId: string): Promise<BackOfficeAccess> {
  const access = await requireBackOffice();
  if (access.store) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { storeId: true } });
    if (order?.storeId !== access.store.id) throw new AccessDeniedError();
  }
  return access;
}

// Stock géré : tous pour le siège, ceux de son magasin pour un compte magasin
export async function requireStockManagement(stockId: string): Promise<BackOfficeAccess> {
  const access = await requireBackOffice();
  if (access.store) {
    const stock = await prisma.storeStock.findUnique({ where: { id: stockId }, select: { storeId: true } });
    if (stock?.storeId !== access.store.id) throw new AccessDeniedError();
  }
  return access;
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

// Commande du client, ou commande du magasin d'un compte magasin (facture depuis le back-office)
export async function canAccessOrder(orderId: string) {
  const access = await currentAccess();
  if (!access) return false;
  if (access.isAdmin) return true;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true, storeId: true } });
  return !!order && (order.userId === access.id || (!!access.managedStoreId && order.storeId === access.managedStoreId));
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
