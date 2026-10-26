import { expect, test } from "@playwright/test";

test("le catalogue, la recherche et une fiche produit s'affichent", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Nos rayons" })).toBeVisible();

  // Suggestions pendant la frappe, puis ouverture d'un produit
  const search = page.getByRole("combobox", { name: "Rechercher un produit" }).first();
  await search.fill("pates");
  const suggestions = page.locator("#search-suggestions");
  await expect(suggestions.getByText("Produits")).toBeVisible();
  await suggestions.locator('a[href^="/product/"]').first().click();

  await expect(page).toHaveURL(/\/product\//);
  // Bouton de l'encadré d'achat (les produits similaires ont aussi le leur) : « Ajouter <nom> au panier »
  await expect(page.locator("#achat").getByRole("button", { name: /^Ajouter .+ au panier$/ })).toBeVisible();
  // Données structurées pour les moteurs de recherche
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test("robots.txt et le sitemap sont publiés", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("/product/");
});

test("la demande de nouveau mot de passe répond sans révéler les comptes", async ({ page }) => {
  await page.goto("/auth/mot-de-passe-oublie");
  await page.locator('input[name="email"]').fill("personne@example.com");
  await page.getByRole("button", { name: "Recevoir le lien" }).click();
  await expect(page.getByText(/Si un compte existe pour cette adresse/)).toBeVisible();
});
