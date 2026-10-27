// Crée le compte de chaque magasin, ou le met à jour : un back-office limité à ce magasin (commandes,
// stocks, tableau de bord). Identifiants : magasin-<slug>@trinity.antoinegourgue.dev. Le mot de passe,
// commun à tous les comptes, est lu dans STORE_ACCOUNT_PASSWORD et n'est jamais écrit dans le dépôt ;
// relancer le script le remplace.
//
// Usage :
//   STORE_ACCOUNT_PASSWORD='…' ./node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node","target":"ES2020"}' prisma/create-store-accounts.ts

import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";
import { storeAccountEmail } from "./stores-data";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.STORE_ACCOUNT_PASSWORD ?? "";
  if (password.length < 12) throw new Error("Définir STORE_ACCOUNT_PASSWORD (12 caractères au moins).");
  const passwordHash = await bcrypt.hash(password, 10);

  const stores = await prisma.store.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } });
  if (stores.length === 0) throw new Error("Aucun magasin en base : lancez d'abord prisma/sync-stores.ts.");

  for (const store of stores) {
    const account = {
      firstName: "Équipe",
      lastName: store.name,
      password: passwordHash,
      role: Role.StoreManager,
      storeId: store.id,
      // Comptes internes : adresse considérée comme confirmée, aucun e-mail commercial
      emailVerified: new Date(),
      cartReminders: false,
      favoritePromos: false,
    };
    const email = storeAccountEmail(store.slug);
    await prisma.user.upsert({ where: { email }, create: { email, ...account }, update: account });
  }

  console.log(`${stores.length} comptes magasin prêts, par exemple ${storeAccountEmail(stores[0].slug)}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
