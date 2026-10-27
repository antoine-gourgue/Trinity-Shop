import ShopShell from "@/components/general/shop-shell";

// Prospectus d'un magasin : ouvert aussi aux comptes magasin, qui le vérifient depuis le back-office
export default function ProspectusLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell openToStaff>{children}</ShopShell>;
}
