import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, signIn, signUp } from "./helpers";

test("un client commande au drive, l'équipe prépare puis annule la commande", async ({ page, browser }) => {
  await signUp(page);

  // Deux produits du rayon Pâtes, dont un mis en favori
  await page.goto("/rayon/epicerie-salee?cat=pates");
  const addButtons = page.getByRole("button", { name: /^Ajouter .+ au panier$/ });
  await addButtons.nth(0).click();
  await expect(page.getByRole("button", { name: "Retirer un article" }).first()).toBeVisible();
  await addButtons.nth(1).click();
  const heart = page.getByRole("button", { name: "Ajouter aux favoris" }).first();
  await heart.click();
  await expect(page.getByRole("button", { name: "Retirer des favoris" }).first()).toBeVisible();

  await page.goto("/user/favoris");
  await expect(page.getByRole("heading", { name: "Mes favoris" })).toBeVisible();
  await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  // Le favori est déjà au panier : rien n'est ajouté deux fois
  await page.getByRole("button", { name: "Tout ajouter au panier" }).click();
  // .first() : la notification est aussi répétée pour les lecteurs d'écran
  await expect(page.getByText("1 produit déjà au panier").first()).toBeVisible();

  // Panier : remplacement accepté par défaut, puis créneau de retrait
  await page.goto("/cart");
  await expect(page.getByText(/Remplacement par un produit équivalent accepté/).first()).toBeVisible();
  await page.getByRole("link", { name: "Valider mon panier" }).first().click();
  await expect(page).toHaveURL(/\/cart\/retrait/);
  await page.getByRole("button", { name: /^\d+h – \d+h$/ }).first().click();
  await page.getByRole("button", { name: "Continuer vers le paiement" }).click();

  // Paiement simulé (pas de clé Stripe dans la CI)
  await expect(page).toHaveURL(/\/cart\/paiement/);
  await page.getByRole("button", { name: /^Payer / }).click();
  await expect(page).toHaveURL(/\/order\/[^/?]+\?confirmation=1/, { timeout: 30_000 });
  await expect(page.getByText("Merci, votre commande est validée !")).toBeVisible();
  await expect(page.getByText("Reçue").first()).toBeVisible();
  const orderPath = new URL(page.url()).pathname;
  const orderId = orderPath.split("/").pop() ?? "";

  // Racheter remet les articles dans le panier
  await page.getByRole("button", { name: "Racheter cette commande" }).click();
  await expect(page.getByText(/ajoutés? au panier/)).toBeVisible();

  // L'équipe fait avancer la commande puis l'annule
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signIn(admin, ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD ?? "");
  await admin.goto(`/admin/orders/${orderId}`);
  await expect(admin.getByText("Remplacement accepté").first()).toBeVisible();
  await admin.getByRole("button", { name: "Passer à « En préparation »" }).click();
  await expect(admin.getByText("En préparation").first()).toBeVisible();
  await admin.getByRole("button", { name: "Annuler la commande" }).first().click();
  await admin.getByRole("dialog").getByRole("button", { name: "Annuler la commande" }).click();
  await expect(admin.getByText("Annulée").first()).toBeVisible();
  await adminContext.close();

  // Le client voit l'annulation
  await page.goto(orderPath);
  await expect(page.getByText("Cette commande a été annulée.")).toBeVisible();
});
