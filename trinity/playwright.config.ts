import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout : ils créent des comptes et des commandes, donc ne tournent que sur une base
// jetable (la CI, ou en local avec E2E_DISPOSABLE_DATABASE=1). Navigateur : le Chrome installé.
const port = Number(process.env.E2E_PORT ?? 3100);
// Sans base jetable déclarée, aucun serveur n'est lancé et global-setup arrête tout
const disposableDatabase = !!process.env.CI || process.env.E2E_DISPOSABLE_DATABASE === "1";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${port}`,
    channel: "chrome",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    // Magasin déjà choisi : la fenêtre de choix ne s'ouvre pas pendant les parcours (e2e/store.spec.ts la teste)
    storageState: {
      cookies: [
        { name: "trinity-store", value: "rennes-epitech", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" },
      ],
      origins: [],
    },
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: disposableDatabase
    ? {
        // Version construite (npm run build), servie sur un port dédié
        command: `npx next start -p ${port}`,
        url: `http://localhost:${port}`,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
