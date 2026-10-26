// Garde-fou : les parcours créent des comptes et des commandes réels dans la base configurée
export default function globalSetup() {
  if (!process.env.CI && process.env.E2E_DISPOSABLE_DATABASE !== "1") {
    throw new Error(
      "Les tests de bout en bout écrivent en base : lancez-les sur une base jetable avec E2E_DISPOSABLE_DATABASE=1 (ou dans la CI)."
    );
  }
  if (!process.env.SEED_ADMIN_PASSWORD) {
    throw new Error("SEED_ADMIN_PASSWORD est nécessaire pour se connecter au compte administrateur créé par le seed.");
  }
}
