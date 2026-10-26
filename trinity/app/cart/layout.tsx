import ShopShell from "@/components/general/shop-shell";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
