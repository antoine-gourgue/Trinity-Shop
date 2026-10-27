import { notFound, redirect } from "next/navigation";
import { backOfficeAccess, type BackOfficeAccess } from "@/services/auth/guards";

// Accès des pages du back-office (la mise en page a déjà refusé les autres comptes)
export async function backOfficePage(): Promise<BackOfficeAccess> {
  const access = await backOfficeAccess();
  if (!access) notFound();
  return access;
}

// Pages du siège (catalogue, clients) : un compte magasin revient à son tableau de bord
export async function headOfficePage(): Promise<BackOfficeAccess> {
  const access = await backOfficePage();
  if (access.store) redirect("/admin");
  return access;
}
