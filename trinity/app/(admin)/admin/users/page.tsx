import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Users } from "lucide-react";
import { auth } from "@/auth";
import { USER_FILTERS, getAdminUsers, parseAdminParams } from "@/lib/admin/queries";
import { AdminPageHeader, AdminPagination, AdminTable, Badge, EmptyState, Panel, Td, Th, adminHref, formatDate } from "@/components/admin/admin-ui";
import { AdminFilterTabs, AdminSearch } from "@/components/admin/admin-toolbar";
import { customerName } from "@/components/admin/admin-bits";
import { DeleteCustomerButton, EditCustomerButton } from "@/components/admin/customer-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clients" };

const ROLE_BADGES = {
  Admin: <Badge tone="dark">Administrateur</Badge>,
  Seller: <Badge tone="warning">Vendeur</Badge>,
  Customer: <Badge tone="brand">Client</Badge>,
} as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseAdminParams(await searchParams);
  const [{ users, total, page, pageCount, counts }, session] = await Promise.all([getAdminUsers(params), auth()]);
  const href = (p: number) => adminHref("/admin/users", { q: params.q, filtre: params.filter, page: p });

  return (
    <div>
      <AdminPageHeader title="Clients" description="Comptes inscrits sur Trinity Shop, du plus récent au plus ancien." />

      <div className="mb-4 flex flex-col gap-3">
        <AdminSearch placeholder="Nom, prénom ou e-mail" />
        <AdminFilterTabs filters={USER_FILTERS} active={params.filter} counts={counts} />
      </div>

      <Panel padded={false}>
        {users.length ? (
          <>
            <AdminTable>
              <thead>
                <tr>
                  <Th>Compte</Th>
                  <Th>Rôle</Th>
                  <Th>Carte Trinity</Th>
                  <Th className="text-right">Commandes</Th>
                  <Th>Inscription</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const name = customerName(user);
                  const isMe = user.id === session?.user?.id;
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-muted/30">
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-black text-primary">
                            {user.firstName.charAt(0).toUpperCase()}
                            {user.lastName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {name}
                              {isMe && <span className="ml-2 text-xs font-bold text-primary">(vous)</span>}
                            </p>
                            <a href={`mailto:${user.email}`} className="block truncate text-xs text-muted-foreground hover:text-primary hover:underline">
                              {user.email}
                            </a>
                            {user.phone && <p className="truncate text-xs text-muted-foreground">{user.phone}</p>}
                          </div>
                        </div>
                      </Td>
                      <Td>{ROLE_BADGES[user.role]}</Td>
                      <Td>
                        {user.loyaltyNumber ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                            <CreditCard size={14} className="text-primary" aria-hidden />
                            {user.loyaltyPoints} pt{user.loyaltyPoints > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {user._count.orders > 0 ? (
                          <Link href={`/admin/orders?q=${encodeURIComponent(user.email)}`} className="font-bold text-primary hover:underline">
                            {user._count.orders}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-muted-foreground">{formatDate(user.createdAt)}</Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          <EditCustomerButton
                            userId={user.id}
                            initial={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, role: user.role }}
                          />
                          {!isMe && <DeleteCustomerButton userId={user.id} name={name} orders={user._count.orders} />}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTable>
            <AdminPagination page={page} pageCount={pageCount} total={total} href={href} unit={["compte", "comptes"]} />
          </>
        ) : (
          <EmptyState icon={Users} title={params.q ? `Aucun compte pour « ${params.q} »` : "Aucun compte"} />
        )}
      </Panel>
    </div>
  );
}
