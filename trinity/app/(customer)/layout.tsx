import ShopShell from "@/components/general/shop-shell";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
