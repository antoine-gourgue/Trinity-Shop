import { expect, test } from "@playwright/test";
import { signIn, signUp } from "./helpers";
import { storeAccountEmail } from "../prisma/stores-data";

// Jour à Paris dans quelques jours (AAAA-MM-JJ), pour la date limite d'un lot
function parisDayIn(days: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(Date.now() + days * 86_400_000));
}

test("le magasin vend un lot anti-gaspi, prépare la commande et la remet au client arrivé au drive", async ({ page, browser }) => {
  // Le magasin déclare un lot à date courte (dans 2 jours : −40 %)
  const storeContext = await browser.newContext();
  const shop = await storeContext.newPage();
  await signIn(shop, storeAccountEmail("rennes-epitech"), process.env.SEED_ADMIN_PASSWORD ?? "");
  await shop.goto("/admin/anti-gaspi");
  await shop.getByRole("searchbox", { name: "Rechercher un produit" }).fill("pâtes");
  // Un produit encore en stock dans le magasin
  const option = shop.getByRole("button", { name: /en stock/ }).filter({ hasNotText: /· [01] en stock/ }).first();
  await expect(option).toBeVisible();
  const productName = ((await option.locator("span.font-semibold").textContent()) ?? "").trim();
  await option.click();
  await shop.getByLabel("Quantité").fill("2");
  await shop.getByLabel("Date limite (DLC ou DDM)").fill(parisDayIn(2));
  await shop.getByRole("button", { name: "Déclarer le lot" }).click();
  await expect(shop.getByText(`Lot déclaré : 2 × ${productName}.`).first()).toBeVisible();
  await expect(shop.getByText("−40 %").first()).toBeVisible();

  // Le client l'ajoute depuis le rayon anti-gaspi et paie avec la remise
  await signUp(page);
  await page.goto("/anti-gaspi");
  await page.getByRole("button", { name: `Ajouter ${productName} au panier à prix anti-gaspi` }).click();
  await expect(page.getByText("Ajouté à prix anti-gaspi").first()).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText(/Anti-gaspi −40 % sur 1/)).toBeVisible();
  await page.getByRole("link", { name: "Valider mon panier" }).first().click();
  await page.getByRole("button", { name: /^\d+h – \d+h$/ }).first().click();
  await page.getByRole("button", { name: "Continuer vers le paiement" }).click();
  await expect(page.getByText("Remise anti-gaspi").first()).toBeVisible();
  await page.getByRole("button", { name: /^Payer / }).click();
  await expect(page).toHaveURL(/\/order\/[^/?]+\?confirmation=1/, { timeout: 30_000 });
  await expect(page.getByText("Remise anti-gaspi").first()).toBeVisible();
  const orderPath = new URL(page.url()).pathname;
  const orderId = orderPath.split("/").pop() ?? "";

  // L'équipe prépare la commande, qui devient prête au drive
  await shop.goto(`/admin/preparation/${orderId}`);
  await expect(shop.getByText(/Anti-gaspi : prendre 1 à date courte/)).toBeVisible();
  await shop.getByRole("button", { name: "Prélevé" }).click();
  await expect(shop.getByText("1 article traité sur 1")).toBeVisible();
  await shop.getByRole("button", { name: "Valider la préparation" }).click();
  await shop.getByRole("dialog").getByRole("button", { name: "Valider" }).click();
  await expect(shop).toHaveURL(/\/admin\/preparation$/);

  // Le client arrive sur le parking et indique sa place
  await page.goto(orderPath);
  await expect(page.getByText("Vous êtes arrivé au drive ?")).toBeVisible();
  await page.getByRole("radio", { name: "Place 3" }).click();
  await page.getByRole("button", { name: "Je suis arrivé, place n° 3" }).click();
  await expect(page.getByText("C’est noté, nous arrivons !")).toBeVisible();

  // Le drive le voit sur le parking et lui remet ses courses
  await shop.goto("/admin/drive");
  // Carte de la commande, repérée par son numéro (les clients de test portent tous le même nom)
  const arrival = shop.locator("li").filter({ hasText: `#${orderId.slice(-8).toUpperCase()}` }).filter({ hasText: "Place" }).first();
  await expect(arrival).toBeVisible();
  await arrival.getByRole("button", { name: "Remis au client" }).click();
  await shop.getByRole("dialog").getByRole("button", { name: "Courses remises" }).click();
  await expect(shop.getByText("Commande remise au client.").first()).toBeVisible();
  await storeContext.close();

  await page.goto(orderPath);
  await expect(page.getByText("Retirée").first()).toBeVisible();
});
