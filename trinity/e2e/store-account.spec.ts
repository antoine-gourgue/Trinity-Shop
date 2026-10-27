import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";
import { storeAccountEmail } from "../prisma/stores-data";

test("un compte magasin travaille dans le back-office de son seul magasin", async ({ page }) => {
  // Compte créé par le seed, avec le mot de passe de l'administrateur
  await signIn(page, storeAccountEmail("rennes-epitech"), process.env.SEED_ADMIN_PASSWORD ?? "");

  // La boutique renvoie vers le back-office du magasin
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Activité de Trinity Rennes Epitech")).toBeVisible();

  // Ni catalogue ni clients : ils sont gérés par le siège
  const menu = page.getByRole("navigation", { name: "Administration" }).first();
  await expect(menu.getByRole("link", { name: "Commandes" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Produits" })).toHaveCount(0);
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin$/);

  // Commandes et stocks du seul magasin, sans choix de magasin
  await page.goto("/admin/orders");
  await expect(page.getByText("Commandes de Trinity Rennes Epitech")).toBeVisible();
  await page.goto("/admin/stocks");
  await expect(page.getByText("Stock de Trinity Rennes Epitech")).toBeVisible();
  await expect(page.getByText("Tous les magasins")).toHaveCount(0);

  await page.goto("/");
  await expect(page).toHaveURL(/\/admin$/);
});
