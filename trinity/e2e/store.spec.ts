import { expect, test } from "@playwright/test";

// Premier passage, sans magasin choisi : la fenêtre de choix s'ouvre seule
test.use({ storageState: { cookies: [], origins: [] } });

test("un visiteur choisit son magasin à son arrivée, puis en change", async ({ page }) => {
  await page.goto("/");
  const picker = page.getByRole("dialog", { name: "Choisissez votre magasin" });
  await expect(picker).toBeVisible();

  // Recherche sans accent ni majuscule
  await picker.getByRole("searchbox", { name: "Rechercher un magasin" }).fill("nantes");
  await picker.getByRole("button", { name: "Choisir Trinity Nantes Beaujoire" }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByRole("button", { name: /Trinity Nantes Beaujoire/ }).first()).toBeVisible();

  // Le choix tient d'une page à l'autre, sans rouvrir la fenêtre
  await page.goto("/legal/faq");
  await expect(page.getByRole("button", { name: /Trinity Nantes Beaujoire/ }).first()).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Changement de magasin depuis le haut de page
  await page.getByRole("button", { name: /Trinity Nantes Beaujoire/ }).first().click();
  await picker.getByRole("searchbox", { name: "Rechercher un magasin" }).fill("44400");
  await picker.getByRole("button", { name: "Choisir Trinity Nantes Rezé" }).click();
  await expect(page.getByRole("button", { name: /Trinity Nantes Rezé/ }).first()).toBeVisible();
});
