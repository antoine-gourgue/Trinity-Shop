import { Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { RAYONS, findRayonForCategories, getRayon, rayonCategoryNames } from "@/lib/rayons";
import { orderDeliveryFee } from "@/lib/delivery";

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
  };
}

function paginate(total: number, page: number) {
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  return { total, pageCount, page: current, skip: (current - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE };
}

// Total d'une commande, comme sur la facture : articles au prix catalogue, moins les bons
// fidélité, plus les frais de livraison à domicile
export function orderTotal(order: {
  loyaltyDiscount: number;
  shippingAddressId: string | null;
  cart: { productsInCart: { quantity: number; product: { price: number } }[] };
}) {
  const items = order.cart.productsInCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  return Math.max(0, items - order.loyaltyDiscount) + orderDeliveryFee(order, items);
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
  shippingAddressId: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  cart: { select: { productsInCart: { select: { quantity: true, product: { select: { price: true } } } } } },
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

export async function getDashboard() {
  const now = new Date();
  const since = addDays(now, -29);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    recentOrders,
    periodOrders,
    orderCount,
    customerCount,
    newCustomers,
    signups,
    loyaltyCards,
    visibleProducts,
    hiddenProducts,
    lowStockCount,
    lowStocks,
    soldItems,
  ] = await Promise.all([
    prisma.order.findMany({ select: ORDER_SUMMARY, orderBy: { createdAt: "desc" }, take: 5 }),
    // Les commandes annulées ne comptent ni dans le chiffre d'affaires ni dans les ventes
    prisma.order.findMany({ where: { createdAt: { gte: since }, status: { not: "cancelled" } }, select: ORDER_SUMMARY }),
    prisma.order.count({ where: { status: { not: "cancelled" } } }),
    prisma.user.count({ where: { role: Role.Customer } }),
    prisma.user.count({ where: { role: Role.Customer, createdAt: { gte: since } } }),
    prisma.user.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    prisma.user.count({ where: { loyaltyNumber: { not: null } } }),
    prisma.product.count({ where: { hidden: false } }),
    prisma.product.count({ where: { hidden: true } }),
    prisma.stock.count({ where: { quantity: { lt: LOW_STOCK }, product: { hidden: false } } }),
    prisma.stock.findMany({
      where: { quantity: { lt: LOW_STOCK }, product: { hidden: false } },
      orderBy: { quantity: "asc" },
      take: 6,
      select: { id: true, quantity: true, product: { select: { id: true, name: true, picture: true, barCode: true } } },
    }),
    // Articles des paniers commandés, pour le classement des meilleures ventes
    prisma.productInCart.groupBy({
      by: ["productId"],
      where: { cart: { orders: { some: { status: { not: "cancelled" } } } } },
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
    visibleProducts,
    hiddenProducts,
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
  const where: Prisma.OrderWhereInput = {
    AND: [
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

  const [total, counts] = await Promise.all([
    prisma.order.count({ where }),
    Promise.all(ORDER_FILTERS.map((f) => prisma.order.count({ where: filters[f.value] ?? {} }))),
  ]);
  const page = paginate(total, params.page);
  const orders = await prisma.order.findMany({
    where,
    select: ORDER_SUMMARY,
    orderBy: { createdAt: "desc" },
    skip: page.skip,
    take: page.take,
  });
  return { orders, ...page, counts: Object.fromEntries(ORDER_FILTERS.map((f, i) => [f.value, counts[i]])) };
}

export function getAdminOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, loyaltyNumber: true } },
      billingAddress: true,
      shippingAddress: true,
      cart: {
        include: {
          productsInCart: {
            include: { product: { select: { id: true, name: true, picture: true, barCode: true, price: true, netContent: true, brand: { select: { name: true } } } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
}

// ——— Produits ———

export const PRODUCT_FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "en-ligne", label: "En ligne" },
  { value: "masques", label: "Masqués" },
  { value: "promo", label: "En promotion" },
  { value: "stock-faible", label: "Stock faible" },
] as const;

function productFilters(): Record<string, Prisma.ProductWhereInput> {
  return {
    "en-ligne": { hidden: false },
    masques: { hidden: true },
    promo: { regularPrice: { not: null } },
    "stock-faible": { stock: { quantity: { lt: LOW_STOCK } } },
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
      stock: { select: { quantity: true } },
      categories: { select: { categoryName: true } },
    },
  });

  return {
    products: products.map(({ categories, ...product }) => {
      const match = findRayonForCategories(categories.map((c) => c.categoryName));
      return { ...product, rayon: match?.subCategory?.label ?? match?.rayon.shortName ?? null };
    }),
    ...page,
    counts: Object.fromEntries(PRODUCT_FILTERS.map((f, i) => [f.value, counts[i]])),
    rayons: RAYONS.map((r) => ({ value: r.slug, label: r.shortName })),
  };
}

export async function getAdminProduct(id: string) {
  const [product, categories, brands, orderedCount] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        brand: { select: { name: true } },
        stock: { select: { id: true, quantity: true, updatedAt: true } },
        categories: { select: { categoryName: true } },
      },
    }),
    prisma.category.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { name: true }, distinct: ["name"], orderBy: { name: "asc" } }),
    prisma.productInCart.count({ where: { productId: id, cart: { orders: { some: {} } } } }),
  ]);
  return product
    ? { product, categoryNames: categories.map((c) => c.name), brandNames: brands.map((b) => b.name), orderedCount }
    : null;
}

// ——— Stocks ———

export const STOCK_FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "faible", label: `Stock faible (< ${LOW_STOCK})` },
  { value: "rupture", label: "En rupture" },
] as const;

export async function getAdminStocks(params: AdminListParams) {
  const filters: Record<string, Prisma.StockWhereInput> = {
    faible: { quantity: { gt: 0, lt: LOW_STOCK } },
    rupture: { quantity: 0 },
  };
  const q = params.q;
  const base: Prisma.StockWhereInput = q
    ? /^\d{6,14}$/.test(q)
      ? { product: { barCode: BigInt(q) } }
      : {
          OR: [
            { product: { name: { contains: q, mode: "insensitive" } } },
            { product: { brand: { name: { contains: q, mode: "insensitive" } } } },
          ],
        }
    : {};
  const where: Prisma.StockWhereInput = { AND: [base, filters[params.filter] ?? {}] };

  const [total, counts, units] = await Promise.all([
    prisma.stock.count({ where }),
    Promise.all(STOCK_FILTERS.map((f) => prisma.stock.count({ where: { AND: [base, filters[f.value] ?? {}] } }))),
    prisma.stock.aggregate({ _sum: { quantity: true } }),
  ]);
  const page = paginate(total, params.page);
  const stocks = await prisma.stock.findMany({
    where,
    orderBy: params.filter === "tous" ? [{ product: { name: "asc" } }] : [{ quantity: "asc" }, { product: { name: "asc" } }],
    skip: page.skip,
    take: page.take,
    select: {
      id: true,
      quantity: true,
      updatedAt: true,
      product: { select: { id: true, name: true, picture: true, barCode: true, hidden: true, brand: { select: { name: true } } } },
    },
  });
  return {
    stocks,
    ...page,
    counts: Object.fromEntries(STOCK_FILTERS.map((f, i) => [f.value, counts[i]])),
    units: units._sum.quantity ?? 0,
  };
}

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
