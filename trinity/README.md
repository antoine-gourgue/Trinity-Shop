# Trinity Shop : application

Application Next.js de [Trinity Shop](../README.md), le drive en ligne. Fonctionnalités, captures, règles métier et déploiement sont décrits dans le [README principal](../README.md).

```bash
npm install
cp .env.example .env.local   # puis remplir les variables
npm run dev                  # http://localhost:3000
```

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Client Prisma puis version de production |
| `npm run lint` | ESLint (code, tests et scripts) |
| `npx tsc --noEmit` | Vérification des types |
| `npm test` | Tests Jest |
| `npm run test:e2e` | Parcours Playwright (base jetable uniquement) |
