# Trinity Shop

[![CI](https://github.com/antoine-gourgue/Trinity-Shop/actions/workflows/ci.yml/badge.svg)](https://github.com/antoine-gourgue/Trinity-Shop/actions/workflows/ci.yml)

Supermarché en ligne de type « drive » : le client remplit son panier dans un catalogue de plus de 1 300 produits réels issus d'[Open Food Facts](https://world.openfoodfacts.org), choisit le retrait au drive ou la livraison à domicile sur un créneau d'une heure, puis paie (paiement simulé). Un back-office permet de suivre les commandes, le catalogue, les stocks et les clients.

> Le paiement est une démonstration : aucune donnée bancaire n'est demandée et aucun débit n'est effectué.

## Aperçu

| Accueil | Rayon et filtres |
|---|---|
| ![Page d'accueil avec les rayons et les mises en avant](.github/readme/accueil.png) | ![Rayon Pâtes avec ses sous-rayons et ses filtres](.github/readme/rayon.png) |
| **Recherche avec suggestions** | **Fiche produit** |
| ![Suggestions de rayons et de produits pendant la frappe](.github/readme/recherche.png) | ![Fiche produit avec prix au kilo et Nutri-Score](.github/readme/produit.png) |
| **Retrait ou livraison** | **Espace client** |
| ![Choix entre retrait au drive et livraison, puis du créneau](.github/readme/commande.png) | ![Tableau de bord de l'espace client](.github/readme/compte.png) |

<table>
  <tr>
    <th>Back-office</th>
    <th>Mobile</th>
  </tr>
  <tr>
    <td><img src=".github/readme/admin.png" alt="Tableau de bord de l'administration : chiffre d'affaires, clients, stocks"></td>
    <td width="240"><img src=".github/readme/mobile.png" alt="Rayon Crèmerie sur mobile, avec la barre de navigation" width="220"></td>
  </tr>
</table>

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Démarrage en local](#démarrage-en-local)
- [Variables d'environnement](#variables-denvironnement)
- [Commandes](#commandes)
- [Données produits](#données-produits)
- [Règles métier](#règles-métier)
- [Qualité et CI](#qualité-et-ci)
- [Déploiement](#déploiement)
- [Conventions](#conventions)

## Fonctionnalités

### Côté client

- **Catalogue par rayons** avec sous-rayons, pagination et filtres combinables : promotions, bio, tranche de prix, Nutri-Score, marques (avec recherche quand la liste est longue) et gamme (marque U ou marques nationales).
- **Tri** par prix, par nom ou par prix au kilo ou au litre, calculé à partir de la contenance du produit.
- **Recherche** tolérante aux accents, avec des suggestions pendant la frappe : rayons correspondants et premiers produits, avec navigation au clavier.
- **Fiche produit** : photo officielle du fabricant, prix et prix au kilo, promotion, ingrédients avec allergènes mis en évidence, tableau nutritionnel, Nutri-Score, produits similaires.
- **Panier** conservé sur le compte.
- **Tunnel de commande** : retrait gratuit au drive ou livraison à domicile (adresse choisie ou ajoutée à la volée), choix du créneau, puis paiement.
- **Carte Trinity** (fidélité) : 1 point par euro dépensé, 100 points = un bon de 5 € à utiliser au paiement.
- **Espace client** : commandes et factures PDF, adresses, téléphone, informations personnelles, mot de passe et carte de fidélité.
- **Scanner de code-barres** : un produit du catalogue ouvre sa fiche, sinon la fiche Open Food Facts s'affiche.
- **Application installable** (PWA) et pages d'information : FAQ, programme de fidélité, contact, mentions légales, confidentialité, cookies.

### Back-office (`/admin`, rôle administrateur)

- **Tableau de bord** : chiffre d'affaires, commandes et inscriptions sur la période, avec graphiques.
- **Commandes** : recherche, filtres (créneau à venir ou passé, livraison) et détail.
- **Produits** : édition, masquage du catalogue, suppression (refusée si le produit a déjà été commandé).
- **Stocks** : modification directe, filtre des ruptures.
- **Clients** : rôles et suppression.

## Stack technique

| Domaine | Outils |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router, server actions), React 18, TypeScript strict |
| Données | PostgreSQL, [Prisma 5](https://www.prisma.io) |
| Authentification | [Auth.js / NextAuth v5](https://authjs.dev) (identifiants, sessions JWT), bcrypt |
| Interface | Tailwind CSS, composants [shadcn/ui](https://ui.shadcn.com) (Radix), lucide-react, recharts |
| Validation | zod (formulaires, corps des requêtes API, données externes) |
| Divers | pdf-lib (factures), Resend + React Email (e-mail de bienvenue), next-pwa, react-qr-barcode-scanner |
| Tests | Jest |
| Hébergement | Vercel, base PostgreSQL [Neon](https://neon.tech) |

## Structure du dépôt

```text
.
├── .github/
│   ├── workflows/ci.yml       CI GitHub Actions
│   └── readme/                Captures d'écran de ce README
└── trinity/                   Application Next.js
    ├── app/                   Pages et routes API (App Router)
    │   ├── (customer)/        Accueil, catalogue, rayons
    │   ├── (admin)/admin/     Back-office
    │   ├── product/           Fiche produit
    │   ├── cart/              Panier et tunnel de commande
    │   ├── user/              Espace client
    │   ├── auth/              Connexion et inscription
    │   ├── legal/             FAQ et pages légales
    │   └── api/               Routes REST (produits, stocks, paniers, commandes, utilisateurs)
    ├── components/            Composants React (catalogue, panier, compte, admin, ui…)
    ├── lib/                   Logique métier, requêtes, server actions
    ├── services/auth/         Inscription, connexion et contrôles d'accès
    ├── schemas/               Schémas zod partagés
    ├── types/                 Types de session NextAuth
    ├── prisma/                Schéma, seed et scripts de données
    ├── data/                  Catalogue et données Open Food Facts (JSON)
    ├── public/products/       Photos produits (une par code-barres)
    ├── __tests__/             Tests Jest
    └── test-utils/            Doublures et outils de test
```

## Démarrage en local

Prérequis : **Node.js 22** et une base **PostgreSQL** (locale ou hébergée).

```bash
cd trinity
npm install
cp .env.example .env.local   # puis remplir les variables
```

Créer les tables et remplir la base avec le catalogue. **Le seed commence par vider toute la base** : ne le lancez jamais sur la production.

```bash
npx prisma db push
npx prisma db seed
```

Lancer le serveur de développement sur [http://localhost:3000](http://localhost:3000) :

```bash
npm run dev
```

Le seed crée le catalogue, 100 comptes clients fictifs (au mot de passe aléatoire) et le compte administrateur `admin@trinity.fr`, dont le mot de passe est celui de `SEED_ADMIN_PASSWORD`.

> Prisma lit `.env`, pas `.env.local`. Pour lancer une commande Prisma avec les variables de `.env.local` : `set -a; source .env.local; set +a; npx prisma db push`.

## Variables d'environnement

Le modèle est dans [`trinity/.env.example`](trinity/.env.example).

| Variable | Rôle |
|---|---|
| `POSTGRES_PRISMA_URL` | URL de connexion avec pool, utilisée par l'application |
| `POSTGRES_URL_NON_POOLING` | URL directe, utilisée par `prisma db push` et les migrations |
| `NEXTAUTH_SECRET` | Clé de signature des sessions (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | Facultatif : e-mail de bienvenue à l'inscription |
| `SEED_ADMIN_PASSWORD` | Mot de passe du compte administrateur créé par le seed (12 caractères au moins) ; inutile en production |

## Commandes

À lancer depuis `trinity/` :

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement (Turbopack) |
| `npm run build` | Génère le client Prisma puis construit l'application |
| `npm start` | Sert la version construite |
| `npm run lint` | ESLint sur tout le code, tests et scripts compris |
| `npx tsc --noEmit` | Vérification des types |
| `npm test` | Tests Jest |
| `npx prisma db push` | Applique le schéma à la base |
| `npx prisma db seed` | Vide puis remplit la base (catalogue, comptes de démonstration) |
| `npx prisma studio` | Explorateur de la base |

## Données produits

Le catalogue vient d'Open Food Facts. Les fichiers de `trinity/data/` servent au seed et sont tenus à jour par les scripts de données :

| Fichier | Contenu |
|---|---|
| `complete_products.json` | Catalogue du seed : nom, code-barres, catégories, marques, prix, contenance |
| `off-enrichment.json` | Contenance et photo par code-barres |
| `national-brands.json` | Produits de marques nationales sélectionnés pour l'import |
| `hidden-products.json` | Codes-barres retirés du catalogue (sans photo officielle) |
| `photo-replacements.json` | Photos officielles qui remplacent d'anciennes photos |

Les photos sont servies depuis `public/products/<code-barres>.jpg`. Seules les photos déposées par les fabricants (comptes « org-… » d'Open Food Facts) sont retenues, pas celles prises en rayon.

Les scripts, dans `prisma/` et `scripts/`, sont relançables et proposent presque tous un mode `--dry-run`. Leur en-tête précise la commande exacte :

| Script | Rôle |
|---|---|
| `scripts/fetch-off-data.mjs` | Récupère contenances et photos sur Open Food Facts |
| `prisma/fetch-national-brands.ts` | Sélectionne des produits de marques nationales avec photo officielle |
| `prisma/import-national-brands.ts` | Importe ces produits en base et dans les données du seed |
| `prisma/apply-pricing.ts` | Calcule des prix et promotions réalistes et déterministes |
| `prisma/hide-products.ts` | Masque les produits listés dans `hidden-products.json` |
| `prisma/replace-photos.ts` | Remplace des photos par la version officielle |

Les fichiers JSON sont validés par des schémas zod (`prisma/data-files.ts`) : un fichier au mauvais format arrête le script avant toute écriture.

## Règles métier

- **Prix** : entiers en millièmes d'euro (`5900` = 5,90 €), ce qui évite les erreurs d'arrondi.
- **Livraison** : 5,90 €, offerte dès 60 € d'articles ; le retrait au drive est gratuit. Une commande livrée est une commande qui a une adresse de livraison.
- **Créneaux** : d'une heure, de 9 h à 13 h et de 14 h à 20 h, sur les six prochains jours d'ouverture à partir du lendemain (fermé le dimanche).
- **Fidélité** : 1 point par euro d'articles ; chaque tranche de 100 points donne un bon de 5 €. Les points d'une commande supprimée sont rendus.
- **Accès** : l'identité vient toujours de la session, jamais d'un identifiant envoyé par le navigateur ; le rôle administrateur est relu en base à chaque contrôle.

## Qualité et CI

- TypeScript en mode strict, **sans aucun `any`** : ESLint interdit les `any` explicites et l'usage de valeurs typées `any` (`no-unsafe-*`), dans l'application comme dans les tests et les scripts.
- Les données externes (corps des requêtes API, réponses d'Open Food Facts, fichiers JSON) sont validées avec zod avant usage.
- Les tests Jest couvrent les routes API et les contrôles d'accès ; ils appellent les handlers avec de vrais `NextRequest`.

La [CI GitHub Actions](.github/workflows/ci.yml) tourne à chaque pull request et à chaque push sur `main` :

1. **Lint, types, tests** : `npm run lint`, `tsc --noEmit`, puis Jest ;
2. **Build** : `next build` sur une base PostgreSQL jetable, remplie par le seed. La base de production n'est jamais utilisée.

## Déploiement

L'application est déployée sur **Vercel**, qui construit chaque commit de `main`. Les jobs **« Lint, types, tests »** et **« Build »** de la CI sont à déclarer comme [Deployment Checks](https://vercel.com/docs/deployment-checks) dans les réglages du projet Vercel : la nouvelle version n'est alors mise en ligne que si la CI réussit.

Variables à définir dans Vercel : `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `NEXTAUTH_SECRET` et, si besoin, `RESEND_API_KEY`.

## Conventions

- Commits au format [Conventional Commits](https://www.conventionalcommits.org) : `type(portée facultative): description`, par exemple `feat(checkout): offer home delivery`.
  Types utilisés : `feat` (fonctionnalité), `fix` (correction), `refactor`, `test`, `docs`, `style`, `chore` (outillage, dépendances) et `ci`. Un `!` après le type signale un changement incompatible.
- Code et messages de commit en anglais, interface et commentaires en français.
