import { Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { RAYONS, findRayonForCategories, getRayon, rayonCategoryNames } from "@/lib/rayons";
import { orderDeliveryFee } from "@/lib/delivery";
import { linePrice } from "@/lib/orders/line-price";
import { SLOT_CAPACITY, pickupHours } from "@/lib/checkout";
import { antiGaspiOutcome, driveWait, preparationStats, slotLoad, upcomingDays } from "@/lib/admin/operations";
import { ANTI_GASPI_WINDOW, bestBeforeFromDay, parisDay } from "@/lib/anti-gaspi";
import { REORDER_POINT, suggestedQuantity } from "@/lib/restock";

// Données du back-office : chaque liste est filtrée et paginée côté serveur

export const ADMIN_PAGE_SIZE = 20;
// En dessous de ce seuil, un stock est signalé comme faible
export const LOW_STOCK = 20;

type RawParams = Record<string, string | string[] | undefined>;

export interface AdminListParams {
  q: string;
  filter: string;
  page: number;
  rayon?: string;
  // Magasin (slug) dont on veut voir les commandes
  magasin?: string;
}

export function parseAdminParams(raw: RawParams, defaultFilter = "tous"): AdminListParams {
  const value = (key: string) => {
    const v = raw[key];
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  };
  const page = Number.parseInt(value("page"), 10);
  return {
    q: value("q"),
    filter: value("filtre") || defaultFilter,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    rayon: value("rayon") || undefined,
    magasin: value("magasin") || undefined,
  };
}

function paginate(total: number, page: number) {
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  return { total, pageCount, page: current, skip: (current - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE };
}

// Total d'une commande, comme sur la facture : articles au prix catalogue, moins les bons
// fidélité et la remise anti-gaspi, plus les frais de livraison à domicile, moins ce qui a été
// remboursé à la préparation
export function orderTotal(order: {
  loyaltyDiscount: number;
  antiGaspiDiscount: number;
  preparationRefund: number;
  shippingAddressId: string | null;
  cart: { productsInCart: { quantity: number; unitPrice: number | null; product: { price: number } }[] };
}) {
  const items = order.cart.productsInCart.reduce((acc, item) => acc + linePrice(item) * item.quantity, 0);
  return Math.max(0, items - order.loyaltyDiscount - order.antiGaspiDiscount - order.preparationRefund) + orderDeliveryFee(order, items);
}

export function articleCount(order: { cart: { productsInCart: { quantity: number }[] } }) {
  return order.cart.productsInCart.reduce((acc, item) => acc + item.quantity, 0);
}

const ORDER_SUMMARY = {
  id: true,
  createdAt: true,
  pickupSlot: true,
  validated: true,
  status: true,
  loyaltyDiscount: true,
  antiGaspiDiscount: true,
  preparationRefund: true,
  shippingAddressId: true,
  store: { select: { name: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  cart: { select: { productsInCart: { select: { quantity: true, unitPrice: true, product: { select: { price: true } } } } } },
} satisfies Prisma.OrderSelect;

export type OrderSummary = Prisma.OrderGetPayload<{ select: typeof ORDER_SUMMARY }>;

// ——— Tableau de bord ———

// Jours calendaires (et non tranches de 24 h, faussées au changement d'heure)
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

// Activité du réseau (siège), ou d'un seul magasin pour un compte magasin : ses commandes, ses
// clients (ceux qui l'ont choisi) et ses stocks
export async function getDashboard(storeId?: string) {
  const now = new Date();
  const since = addDays(now, -29);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const inStore = storeId ? { storeId } : {};
  const customers: Prisma.UserWhereInput = { role: Role.Customer, ...inStore };
  // Stock des produits en ligne seulement : un produit masqué n'est plus vendu
  const onSale: Prisma.StoreStockWhereInput = { product: { hidden: false }, ...inStore };

  const [
    recentOrders,
    periodOrders,
    orderCount,
    customerCount,
    newCustomers,
    signups,
    loyaltyCards,
    ruptureCount,
    lowStockCount,
    lowStocks,
    soldItems,
  ] = await Promise.all([
    prisma.order.findMany({ where: inStore, select: ORDER_SUMMARY, orderBy: { createdAt: "desc" }, take: 5 }),
    // Les commandes annulées ne comptent ni dans le chiffre d'affaires ni dans les ventes
    prisma.order.findMany({ where: { ...inStore, createdAt: { gte: since }, status: { not: "cancelled" } }, select: ORDER_SUMMARY }),
    prisma.order.count({ where: { ...inStore, status: { not: "cancelled" } } }),
    prisma.user.count({ where: customers }),
    prisma.user.count({ where: { ...customers, createdAt: { gte: since } } }),
    prisma.user.findMany({ where: { ...customers, createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.user.count({ where: { ...customers, loyaltyNumber: { not: null } } }),
    prisma.storeStock.count({ where: { ...onSale, quantity: 0 } }),
    prisma.storeStock.count({ where: { ...onSale, quantity: { gt: 0, lt: LOW_STOCK } } }),
    prisma.storeStock.findMany({
      where: { ...onSale, quantity: { lt: LOW_STOCK } },
      orderBy: { quantity: "asc" },
      take: 6,
      select: {
        id: true,
        quantity: true,
        store: { select: { name: true, slug: true } },
        product: { select: { id: true, name: true, picture: true, barCode: true } },
      },
    }),
    // Articles des paniers commandés, pour le classement des meilleures ventes
    prisma.productInCart.groupBy({
      by: ["productId"],
      where: { cart: { orders: { some: { ...inStore, status: { not: "cancelled" } } } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const revenue = periodOrders.reduce((acc, order) => acc + orderTotal(order), 0);

  // Chiffre d'affaires jour par jour sur 30 jours
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = addDays(since, i);
    return { key: dayKey(day), label: day.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), total: 0, orders: 0 };
  });
  for (const order of periodOrders) {
    const day = days.find((d) => d.key === dayKey(order.createdAt));
    if (day) {
      day.total += orderTotal(order) / 1000;
      day.orders += 1;
    }
  }

  // Inscriptions par mois sur 6 mois
  const months = Array.from({ length: 6 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { year: month.getFullYear(), month: month.getMonth(), label: month.toLocaleDateString("fr-FR", { month: "short" }), count: 0 };
  });
  for (const { createdAt } of signups) {
    const month = months.find((m) => m.year === createdAt.getFullYear() && m.month === createdAt.getMonth());
    if (month) month.count += 1;
  }

  const topProducts = soldItems.length
    ? await prisma.product.findMany({
        where: { id: { in: soldItems.map((item) => item.productId) } },
        select: { id: true, name: true, picture: true, barCode: true, price: true },
      })
    : [];

  return {
    revenue,
    periodOrderCount: periodOrders.length,
    averageBasket: periodOrders.length ? Math.round(revenue / periodOrders.length) : 0,
    orderCount,
    customerCount,
    newCustomers,
    loyaltyCards,
    ruptureCount,
    lowStockCount,
    lowStocks,
    recentOrders,
    revenueByDay: days.map(({ label, total, orders }) => ({ label, total: Math.round(total * 100) / 100, orders })),
    signupsByMonth: months.map(({ label, count }) => ({ label, count })),
    topProducts: soldItems
      .map((item) => ({ product: topProducts.find((p) => p.id === item.productId), quantity: item._sum.quantity ?? 0 }))
      .filter((item): item is { product: NonNullable<typeof item.product>; quantity: number } => !!item.product),
  };
}

// ——— Commandes ———

export const ORDER_FILTERS = [
  { value: "tous", label: "Toutes" },
  { value: "a-preparer", label: "À préparer" },
  { value: "pretes", label: "Prêtes" },
  { value: "terminees", label: "Terminées" },
  { value: "annulees", label: "Annulées" },
  { value: "livraison", label: "Livraison à domicile" },
] as const;

export async function getAdminOrders(params: AdminListParams) {
  const filters: Record<string, Prisma.OrderWhereInput> = {
    "a-preparer": { status: { in: ["received", "preparing"] } },
    pretes: { status: "ready" },
    terminees: { status: "completed" },
    annulees: { status: "cancelled" },
    livraison: { shippingAddressId: { not: null } },
  };
  const q = params.q;
  // Équipe d'un drive : seulement les commandes de son magasin, onglets compris
  const storeFilter: Prisma.OrderWhereInput = params.magasin ? { store: { slug: params.magasin } } : {};
  const where: Prisma.OrderWhereInput = {
    AND: [
      storeFilter,
      filters[params.filter] ?? {},
      q
        ? {
            OR: [
              { id: { contains: q.toLowerCase() } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { firstName: { contains: q, mode: "insensitive" } } },
              { user: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [total, counts, stores] = await Promise.all([
    prisma.order.count({ where }),
    Promise.all(ORDER_FILTERS.map((f) => prisma.order.count({ where: { AND: [storeFilter, filters[f.value] ?? {}] } }))),
    prisma.store.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const page = paginate(total, params.page);
  const orders = await prisma.order.findMany({
    where,
    select: ORDER_SUMMARY,
    orderBy: { createdAt: "desc" },
    skip: page.skip,
    take: page.take,
  });
  return {
    orders,
    ...page,
    counts: Object.fromEntries(ORDER_FILTERS.map((f, i) => [f.value, counts[i]])),
    stores: stores.map((store) => ({ value: store.slug, label: store.name })),
  };
}

export function getAdminOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, loyaltyNumber: true } },
      billingAddress: true,
      shippingAddress: true,
      store: { select: { name: true, street: true, zipCode: true, city: true } },
      cart: {
        include: {
          productsInCart: {
            include: {
              product: { select: { id: true, name: true, picture: true, barCode: true, price: true, netContent: true, brand: { select: { name: true } } } },
              substitute: { select: { name: true, price: true } },
              lotAllocations: { select: { quantity: true, lot: { select: { bestBefore: true } } } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
}

// Stock d'un produit sur le réseau : unités, magasins qui le proposent et magasins en rupture
function stockSummary(stocks: { quantity: number }[]) {
  return {
    units: stocks.reduce((total, stock) => total + stock.quantity, 0),
    stores: stocks.length,
    ruptures: stocks.filter((stock) => stock.quantity === 0).length,
  };
}

// ——— Produits ———

export const PRODUCT_FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "en-ligne", label: "En ligne" },
  { value: "masques", label: "Masqués" },
  { value: "promo", label: "En promotion" },
  { value: "rupture", label: "Rupture en magasin" },
] as const;

function productFilters(): Record<string, Prisma.ProductWhereInput> {
  return {
    "en-ligne": { hidden: false },
    masques: { hidden: true },
    promo: { regularPrice: { not: null } },
    rupture: { stocks: { some: { quantity: 0 } } },
  };
}

export async function getAdminProducts(params: AdminListParams) {
  const filters = productFilters();
  const rayon = params.rayon ? getRayon(params.rayon) : undefined;
  const q = params.q;
  const base: Prisma.ProductWhereInput = {
    AND: [
      rayon ? { categories: { some: { categoryName: { in: rayonCategoryNames(rayon) } } } } : {},
      q
        ? /^\d{6,14}$/.test(q)
          ? { barCode: BigInt(q) }
          : {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { brand: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
        : {},
    ],
  };
  const where: Prisma.ProductWhereInput = { AND: [base, filters[params.filter] ?? {}] };

  const [total, counts] = await Promise.all([
    prisma.product.count({ where }),
    Promise.all(PRODUCT_FILTERS.map((f) => prisma.product.count({ where: { AND: [base, filters[f.value] ?? {}] } }))),
  ]);
  const page = paginate(total, params.page);
  const products = await prisma.product.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: page.skip,
    take: page.take,
    select: {
      id: true,
      name: true,
      picture: true,
      barCode: true,
      price: true,
      regularPrice: true,
      netContent: true,
      nutriScore: true,
      hidden: true,
      brand: { select: { name: true } },
      stocks: { select: { quantity: true } },
      categories: { select: { categoryName: true } },
    },
  });

  return {
    products: products.map(({ categories, stocks, ...product }) => {
      const match = findRayonForCategories(categories.map((c) => c.categoryName));
      return { ...product, stock: stockSummary(stocks), rayon: match?.subCategory?.label ?? match?.rayon.shortName ?? null };
    }),
    ...page,
    counts: Object.fromEntries(PRODUCT_FILTERS.map((f, i) => [f.value, counts[i]])),
    rayons: RAYONS.map((r) => ({ value: r.slug, label: r.shortName })),
  };
}

// Catégories et marques existantes, proposées par le formulaire produit
export async function getProductFormOptions() {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { name: true }, distinct: ["name"], orderBy: { name: "asc" } }),
  ]);
  return { categoryNames: categories.map((c) => c.name), brandNames: brands.map((b) => b.name) };
}

export async function getAdminProduct(id: string) {
  const [product, options, orderedCount] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        brand: { select: { name: true } },
        stocks: { select: { quantity: true, updatedAt: true } },
        categories: { select: { categoryName: true } },
      },
    }),
    getProductFormOptions(),
    prisma.productInCart.count({ where: { productId: id, cart: { orders: { some: {} } } } }),
  ]);
  if (!product) return null;
  const { stocks, ...rest } = product;
  const lastUpdate = stocks.reduce<Date | null>((latest, stock) => (!latest || stock.updatedAt > latest ? stock.updatedAt : latest), null);
  return { product: { ...rest, stock: { ...stockSummary(stocks), lastUpdate } }, ...options, orderedCount };
}

// ——— Stocks ———

export const STOCK_FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "faible", label: `Stock faible (< ${LOW_STOCK})` },
  { value: "rupture", label: "En rupture" },
] as const;

// Stock de chaque magasin : un magasin choisi, ou tout le réseau (une ligne par magasin et par produit)
export async function getAdminStocks(params: AdminListParams) {
  const filters: Record<string, Prisma.StoreStockWhereInput> = {
    faible: { quantity: { gt: 0, lt: LOW_STOCK } },
    rupture: { quantity: 0 },
  };
  const q = params.q;
  const search: Prisma.StoreStockWhereInput = q
    ? /^\d{6,14}$/.test(q)
      ? { product: { barCode: BigInt(q) } }
      : {
          OR: [
            { product: { name: { contains: q, mode: "insensitive" } } },
            { product: { brand: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
    : {};
  const base: Prisma.StoreStockWhereInput = { AND: [search, params.magasin ? { store: { slug: params.magasin } } : {}] };
  const where: Prisma.StoreStockWhereInput = { AND: [base, filters[params.filter] ?? {}] };

  const [total, counts, units, stores] = await Promise.all([
    prisma.storeStock.count({ where }),
    Promise.all(STOCK_FILTERS.map((f) => prisma.storeStock.count({ where: { AND: [base, filters[f.value] ?? {}] } }))),
    prisma.storeStock.aggregate({ where: base, _sum: { quantity: true } }),
    prisma.store.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const page = paginate(total, params.page);
  const stocks = await prisma.storeStock.findMany({
    where,
    orderBy:
      params.filter === "tous"
        ? [{ product: { name: "asc" } }, { store: { name: "asc" } }]
        : [{ quantity: "asc" }, { product: { name: "asc" } }, { store: { name: "asc" } }],
    skip: page.skip,
    take: page.take,
    select: {
      id: true,
      quantity: true,
      updatedAt: true,
      storeId: true,
      productId: true,
      store: { select: { name: true } },
      product: { select: { id: true, name: true, picture: true, barCode: true, hidden: true, brand: { select: { name: true } } } },
    },
  });
  // Date limite la plus proche des lots de chaque ligne
  const nearest = stocks.length
    ? await prisma.stockLot.groupBy({
        by: ["storeId", "productId"],
        where: { closedAt: null, quantity: { gt: 0 }, OR: stocks.map(({ storeId, productId }) => ({ storeId, productId })) },
        _min: { bestBefore: true },
      })
    : [];
  const nextBestBefore = new Map(nearest.map((lot) => [`${lot.storeId}:${lot.productId}`, lot._min.bestBefore]));
  return {
    stocks: stocks.map((stock) => ({ ...stock, nextBestBefore: nextBestBefore.get(`${stock.storeId}:${stock.productId}`) ?? null })),
    ...page,
    counts: Object.fromEntries(STOCK_FILTERS.map((f, i) => [f.value, counts[i]])),
    units: units._sum.quantity ?? 0,
    stores: stores.map((store) => ({ value: store.slug, label: store.name })),
  };
}

// ——— Préparation ———

// Commandes à préparer, dans l'ordre des créneaux (les commandes sans créneau en dernier)
export async function getPreparationQueue(storeSlug?: string) {
  return prisma.order.findMany({
    where: { status: { in: ["received", "preparing"] }, ...(storeSlug ? { store: { slug: storeSlug } } : {}) },
    orderBy: [{ pickupSlot: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    select: {
      id: true,
      status: true,
      pickupSlot: true,
      shippingAddressId: true,
      store: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } },
      cart: { select: { productsInCart: { select: { quantity: true, preparedQuantity: true } } } },
    },
    take: 100,
  });
}

export type PreparationQueueOrder = Awaited<ReturnType<typeof getPreparationQueue>>[number];

// Commande à préparer, avec ses articles, leurs rayons et leurs remplaçants éventuels
export function getPreparation(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      storeId: true,
      pickupSlot: true,
      shippingAddressId: true,
      preparationRefund: true,
      store: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } },
      cart: {
        select: {
          productsInCart: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              quantity: true,
              preparedQuantity: true,
              allowSubstitute: true,
              substitute: { select: { id: true, name: true, price: true, netContent: true } },
              antiGaspiQuantity: true,
              antiGaspiDiscount: true,
              unitPrice: true,
              antiGaspiLot: { select: { bestBefore: true } },
              lotAllocations: { select: { quantity: true, lot: { select: { bestBefore: true } } } },
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  picture: true,
                  netContent: true,
                  barCode: true,
                  brand: { select: { name: true } },
                  categories: { select: { categoryName: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

// ——— Indicateurs opérationnels ———

// Bilan des lots anti-gaspi déclarés sur la période
// Dates courtes de la période : unités vendues à prix anti-gaspi (commandes non annulées), données ou
// jetées (lots clos sur la période)
async function antiGaspiTotals(storeId: string | undefined, since: Date) {
  const inStore = storeId ? { storeId } : {};
  const [sold, lots] = await Promise.all([
    prisma.productInCart.aggregate({
      where: { antiGaspiQuantity: { gt: 0 }, cart: { orders: { some: { ...inStore, createdAt: { gte: since }, status: { not: "cancelled" } } } } },
      _sum: { antiGaspiQuantity: true },
    }),
    prisma.stockLot.aggregate({
      where: { ...inStore, closedAt: { gte: since } },
      _sum: { donatedQuantity: true, wastedQuantity: true },
    }),
  ]);
  return antiGaspiOutcome({
    sold: sold._sum.antiGaspiQuantity ?? 0,
    donated: lots._sum.donatedQuantity ?? 0,
    wasted: lots._sum.wastedQuantity ?? 0,
  });
}

// Préparation, drive, charge des créneaux et anti-gaspi sur 30 jours, pour un magasin ou le réseau
export async function getOperations(storeId?: string) {
  const now = new Date();
  const since = addDays(now, -29);
  const inStore = storeId ? { storeId } : {};
  const days = upcomingDays(now, 6);
  const firstDay = new Date(`${days[0].date}T00:00:00Z`);

  const [prepared, handedOver, lateOrders, waiting, booked, storeCount, antiGaspi] = await Promise.all([
    prisma.order.findMany({
      where: { ...inStore, preparedAt: { gte: since }, status: { not: "cancelled" } },
      select: {
        preparationStartedAt: true,
        preparedAt: true,
        pickupSlot: true,
        preparationRefund: true,
        cart: { select: { productsInCart: { select: { quantity: true, preparedQuantity: true, substituteId: true, allowSubstitute: true } } } },
      },
    }),
    prisma.order.findMany({ where: { ...inStore, completedAt: { gte: since }, arrivedAt: { not: null } }, select: { arrivedAt: true, completedAt: true } }),
    // Commandes pas encore prêtes alors que leur créneau a commencé
    prisma.order.count({ where: { ...inStore, status: { in: ["received", "preparing"] }, pickupSlot: { lt: now } } }),
    prisma.order.count({ where: { ...inStore, status: "ready", arrivedAt: { not: null }, shippingAddressId: null } }),
    prisma.order.groupBy({
      by: ["pickupSlot"],
      where: { ...inStore, status: { not: "cancelled" }, pickupSlot: { gte: new Date(firstDay.getTime() - 3 * 3_600_000) } },
      _count: { _all: true },
    }),
    storeId ? Promise.resolve(1) : prisma.store.count(),
    antiGaspiTotals(storeId, since),
  ]);

  return {
    preparation: preparationStats(prepared.map(({ cart, ...order }) => ({ ...order, lines: cart.productsInCart }))),
    drive: { ...driveWait(handedOver), waiting },
    lateOrders,
    // Capacité d'un créneau : celle d'un drive, ou de tous les drives pour le siège
    slots: slotLoad(
      booked.map((group) => ({ pickupSlot: group.pickupSlot, count: group._count._all })),
      days,
      pickupHours(),
      SLOT_CAPACITY * storeCount
    ),
    capacity: SLOT_CAPACITY * storeCount,
    antiGaspi,
  };
}

// ——— Drive ———

// Commandes prêtes à retirer : clients arrivés sur le parking d'abord (par ordre d'arrivée), puis
// les autres par créneau
export async function getDriveBoard(storeId?: string) {
  const inStore = storeId ? { storeId } : {};
  const startOfDay = addDays(new Date(), 0);
  const [orders, handedOverToday] = await Promise.all([
    prisma.order.findMany({
      where: { ...inStore, status: "ready", shippingAddressId: null },
      orderBy: [{ arrivedAt: { sort: "asc", nulls: "last" } }, { pickupSlot: { sort: "asc", nulls: "last" } }],
      take: 100,
      select: {
        id: true,
        pickupSlot: true,
        arrivedAt: true,
        parkingSpot: true,
        store: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, phone: true } },
        cart: { select: { productsInCart: { select: { quantity: true } } } },
      },
    }),
    prisma.order.findMany({
      where: { ...inStore, completedAt: { gte: startOfDay }, shippingAddressId: null },
      select: { arrivedAt: true, completedAt: true },
    }),
  ]);
  return { orders, today: driveWait(handedOverToday), handedOverToday: handedOverToday.length };
}

export type DriveBoardOrder = Awaited<ReturnType<typeof getDriveBoard>>["orders"][number];

// ——— Anti-gaspi ———

const LOT_SELECT = {
  id: true,
  quantity: true,
  initialQuantity: true,
  bestBefore: true,
  markdownDays: true,
  soldQuantity: true,
  donatedQuantity: true,
  wastedQuantity: true,
  withdrawnAt: true,
  closedAt: true,
  store: { select: { name: true, slug: true } },
  product: {
    select: { id: true, name: true, price: true, picture: true, netContent: true, barCode: true, categories: { select: { categoryName: true } } },
  },
} satisfies Prisma.StockLotSelect;

export type AdminLot = Prisma.StockLotGetPayload<{ select: typeof LOT_SELECT }>;

// Lots ouverts à date courte (ou dépassée), les plus proches d'abord ; lots clos sur 30 jours avec des
// unités données ou jetées ; bilan de la période
export async function getAntiGaspiBoard(storeId?: string) {
  const since = addDays(new Date(), -29);
  const inStore = storeId ? { storeId } : {};
  const horizon = new Date(bestBeforeFromDay(parisDay(new Date())).getTime() + ANTI_GASPI_WINDOW * 86_400_000);
  const [open, closed, totals] = await Promise.all([
    prisma.stockLot.findMany({
      where: { ...inStore, closedAt: null, quantity: { gt: 0 }, bestBefore: { lte: horizon } },
      orderBy: [{ bestBefore: "asc" }, { createdAt: "asc" }],
      take: 200,
      select: LOT_SELECT,
    }),
    prisma.stockLot.findMany({
      where: { ...inStore, closedAt: { gte: since }, OR: [{ donatedQuantity: { gt: 0 } }, { wastedQuantity: { gt: 0 } }] },
      orderBy: { closedAt: "desc" },
      take: 30,
      select: LOT_SELECT,
    }),
    antiGaspiTotals(storeId, since),
  ]);
  return { open, closed, totals };
}

// ——— Réassort ———

const RESTOCK_SELECT = {
  id: true,
  quantity: true,
  status: true,
  automatic: true,
  orderedAt: true,
  expectedAt: true,
  receivedAt: true,
  receivedQuantity: true,
  store: { select: { name: true } },
  product: { select: { id: true, name: true, picture: true, netContent: true, barCode: true, shelfLifeDays: true } },
  lot: { select: { bestBefore: true } },
} satisfies Prisma.RestockOrderSelect;

export type AdminRestockOrder = Prisma.RestockOrderGetPayload<{ select: typeof RESTOCK_SELECT }>;

// Ventes d'un magasin sur deux semaines, par produit
async function recentSales(storeId: string, productIds: string[]) {
  if (productIds.length === 0) return new Map<string, number>();
  const sales = await prisma.productInCart.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      cart: { orders: { some: { storeId, createdAt: { gte: addDays(new Date(), -13) }, status: { not: "cancelled" } } } },
    },
    _sum: { quantity: true },
  });
  return new Map(sales.map((sale) => [sale.productId, sale._sum.quantity ?? 0]));
}

// Livraisons à réceptionner et en route, réceptions de la semaine, et, pour un magasin, les produits à
// recommander (sous le seuil, sans commande en cours) avec la quantité suggérée
export async function getRestockBoard(storeId?: string) {
  const now = new Date();
  const inStore = storeId ? { storeId } : {};
  const [toReceive, inDelivery, received, low] = await Promise.all([
    prisma.restockOrder.findMany({ where: { ...inStore, status: "ordered", expectedAt: { lte: now } }, orderBy: { expectedAt: "asc" }, take: 100, select: RESTOCK_SELECT }),
    prisma.restockOrder.findMany({ where: { ...inStore, status: "ordered", expectedAt: { gt: now } }, orderBy: { orderedAt: "desc" }, take: 100, select: RESTOCK_SELECT }),
    prisma.restockOrder.findMany({
      where: { ...inStore, status: "received", receivedAt: { gte: addDays(now, -6) } },
      orderBy: { receivedAt: "desc" },
      take: 30,
      select: RESTOCK_SELECT,
    }),
    storeId
      ? prisma.storeStock.findMany({
          where: { storeId, quantity: { lt: REORDER_POINT }, product: { hidden: false, restockOrders: { none: { storeId, status: "ordered" } } } },
          orderBy: [{ quantity: "asc" }, { product: { name: "asc" } }],
          take: 30,
          select: { quantity: true, product: { select: { id: true, name: true, picture: true, netContent: true } } },
        })
      : Promise.resolve([]),
  ]);
  const sales = storeId ? await recentSales(storeId, low.map((stock) => stock.product.id)) : new Map<string, number>();
  const suggestions = low.map((stock) => {
    const sold = sales.get(stock.product.id) ?? 0;
    return { ...stock, sold, suggested: suggestedQuantity(stock.quantity, sold) };
  });
  return { toReceive, inDelivery, received, suggestions };
}

// ——— Détail d'un stock ———

// Stock d'un produit dans un magasin : ses lots (ouverts, puis clos récemment), les commandes servies
// par chaque lot (traçabilité, rappel d'un lot) et les réassorts du produit
export async function getStockDetail(stockId: string) {
  const stock = await prisma.storeStock.findUnique({
    where: { id: stockId },
    select: {
      id: true,
      quantity: true,
      storeId: true,
      productId: true,
      store: { select: { name: true, slug: true } },
      product: {
        select: { id: true, name: true, picture: true, netContent: true, barCode: true, price: true, shelfLifeDays: true, brand: { select: { name: true } } },
      },
    },
  });
  if (!stock) return null;
  const lotSelect = {
    id: true,
    quantity: true,
    initialQuantity: true,
    bestBefore: true,
    markdownDays: true,
    soldQuantity: true,
    donatedQuantity: true,
    wastedQuantity: true,
    adjustedQuantity: true,
    receivedAt: true,
    withdrawnAt: true,
    closedAt: true,
    restockOrder: { select: { automatic: true } },
    allocations: {
      orderBy: { createdAt: "desc" as const },
      take: 20,
      select: {
        quantity: true,
        line: { select: { cart: { select: { orders: { select: { id: true, createdAt: true, status: true, user: { select: { firstName: true, lastName: true } } } } } } } },
      },
    },
  } satisfies Prisma.StockLotSelect;
  const [open, closed, restocks] = await Promise.all([
    prisma.stockLot.findMany({ where: { storeId: stock.storeId, productId: stock.productId, closedAt: null }, orderBy: { bestBefore: "asc" }, select: lotSelect }),
    prisma.stockLot.findMany({
      where: { storeId: stock.storeId, productId: stock.productId, closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 10,
      select: lotSelect,
    }),
    prisma.restockOrder.findMany({
      where: { storeId: stock.storeId, productId: stock.productId },
      orderBy: { orderedAt: "desc" },
      take: 10,
      select: RESTOCK_SELECT,
    }),
  ]);
  return { ...stock, lots: [...open, ...closed], restocks };
}

export type StockDetail = NonNullable<Awaited<ReturnType<typeof getStockDetail>>>;

// ——— Clients ———

export const USER_FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "clients", label: "Clients" },
  { value: "admins", label: "Administrateurs" },
  { value: "carte", label: "Carte Trinity" },
] as const;

export async function getAdminUsers(params: AdminListParams) {
  const filters: Record<string, Prisma.UserWhereInput> = {
    clients: { role: Role.Customer },
    admins: { role: Role.Admin },
    carte: { loyaltyNumber: { not: null } },
  };
  const q = params.q;
  const base: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const where: Prisma.UserWhereInput = { AND: [base, filters[params.filter] ?? {}] };

  const [total, counts] = await Promise.all([
    prisma.user.count({ where }),
    Promise.all(USER_FILTERS.map((f) => prisma.user.count({ where: { AND: [base, filters[f.value] ?? {}] } }))),
  ]);
  const page = paginate(total, params.page);
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: page.skip,
    take: page.take,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      loyaltyNumber: true,
      loyaltyPoints: true,
      _count: { select: { orders: true } },
    },
  });
  return { users, ...page, counts: Object.fromEntries(USER_FILTERS.map((f, i) => [f.value, counts[i]])) };
}
