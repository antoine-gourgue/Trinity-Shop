import ShopShell from "@/components/general/shop-shell";
import AccountNav from "@/components/account/account-nav";
import { requireUser } from "@/lib/account";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <ShopShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <AccountNav
            userId={user.id}
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
            isAdmin={user.role === "Admin"}
          />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </ShopShell>
  );
}
