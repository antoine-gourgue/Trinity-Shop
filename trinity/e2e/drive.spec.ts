import { expect, test } from "@playwright/test";
import { signIn, signUp } from "./helpers";
import { storeAccountEmail } from "../prisma/stores-data";

// Jour à Paris dans quelques jours (AAAA-MM-JJ), pour la date limite d'un lot
function parisDayIn(days: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(Date.now() + days * 86_400_000));
}

test("un réassort à date courte passe en anti-gaspi, le magasin prépare la commande et la remet au client arrivé au drive", async ({ page, browser }) => {
  // Le magasin commande un réassort et le réceptionne avec une date courte (dans 2 jours) : le lot
  // passe tout seul en anti-gaspi
  const storeContext = await browser.newContext();
  const shop = await storeContext.newPage();
  await signIn(shop, storeAccountEmail("rennes-epitech"), process.env.SEED_ADMIN_PASSWORD ?? "");
  await shop.goto("/admin/reassort");
  await shop.getByRole("searchbox", { name: "Rechercher un produit" }).fill("pâtes");
  const option = shop.getByRole("button", { name: /en stock/ }).first();
  await expect(option).toBeVisible();
  const productName = ((await option.locator("span.font-semibold").textContent()) ?? "").trim();
  await option.click();
  await shop.getByLabel("Quantité").fill("2");
  await shop.getByRole("button", { name: "Commander", exact: true }).click();
  await expect(shop.getByText(`Réassort commandé : 2 × ${productName}, livré demain.`).first()).toBeVisible();
  const delivery = shop.locator("li").filter({ hasText: productName }).filter({ has: shop.getByRole("button", { name: "Réceptionner" }) }).first();
  await delivery.getByRole("button", { name: "Réceptionner" }).click();
  const reception = shop.getByRole("dialog");
  await reception.getByLabel("Date limite du lot").fill(parisDayIn(2));
  await reception.getByRole("button", { name: "Valider la réception" }).click();
  await expect(shop.getByText(`Réception enregistrée : 2 × ${productName} en stock.`).first()).toBeVisible();

  // Le client l'ajoute depuis le rayon anti-gaspi et paie avec la remise
  await signUp(page);
  await page.goto("/anti-gaspi");
  await page.getByRole("button", { name: `Ajouter ${productName} au panier à prix anti-gaspi` }).click();
  await expect(page.getByText("Ajouté à prix anti-gaspi").first()).toBeVisible();
  await page.goto("/cart");
  // Remise selon la date du lot le plus proche du produit (−40 % à deux jours, plus la veille)
  await expect(page.getByRole("main").getByText(/Anti-gaspi −\d+ % sur 1/)).toBeVisible();
  await page.getByRole("link", { name: "Valider mon panier" }).first().click();
  await page.getByRole("button", { name: /^\d+h – \d+h$/ }).first().click();
  await page.getByRole("button", { name: "Continuer vers le paiement" }).click();
  await expect(page.getByText("Remise anti-gaspi").first()).toBeVisible();
  await page.getByRole("button", { name: /^Payer / }).click();
  await expect(page).toHaveURL(/\/order\/[^/?]+\?confirmation=1/, { timeout: 30_000 });
  await expect(page.getByText("Remise anti-gaspi").first()).toBeVisible();
  const orderPath = new URL(page.url()).pathname;
  const orderId = orderPath.split("/").pop() ?? "";

  // L'équipe prépare la commande, qui devient prête au drive. Les textes sont cherchés dans la page
  // affichée (main) : pendant le chargement, Next garde des morceaux de page cachés à côté
  await shop.goto(`/admin/preparation/${orderId}`);
  await expect(shop.getByRole("main").getByText(/Anti-gaspi : prendre 1 à date courte/)).toBeVisible();
  await shop.getByRole("button", { name: "Prélevé" }).click();
  await expect(shop.getByRole("main").getByText("1 article traité sur 1")).toBeVisible();
  await shop.getByRole("button", { name: "Valider la préparation" }).click();
  await shop.getByRole("dialog").getByRole("button", { name: "Valider" }).click();
  await expect(shop).toHaveURL(/\/admin\/preparation$/);

  // Le client arrive sur le parking et indique sa place
  await page.goto(orderPath);
  await expect(page.getByRole("main").getByText("Vous êtes arrivé au drive ?")).toBeVisible();
  await page.getByRole("radio", { name: "Place 3" }).click();
  await page.getByRole("button", { name: "Je suis arrivé, place n° 3" }).click();
  await expect(page.getByRole("main").getByText("C’est noté, nous arrivons !")).toBeVisible();

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
