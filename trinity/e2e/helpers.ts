import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@trinity.fr";

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/signin");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/\/auth\/signin/);
}

// Nouveau client, unique à chaque exécution
export async function signUp(page: Page) {
  const id = Date.now().toString(36);
  const account = { firstName: "Camille", lastName: "Essai", email: `camille.${id}@example.com`, password: `Motdepasse-${id}` };
  await page.goto("/auth");
  await page.locator('input[name="firstName"]').fill(account.firstName);
  await page.locator('input[name="lastName"]').fill(account.lastName);
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await expect(page.getByText(`Bonjour ${account.firstName}`).first()).toBeVisible();
  return account;
}
