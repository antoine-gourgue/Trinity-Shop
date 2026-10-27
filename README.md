# Trinity Shop

[![CI](https://github.com/antoine-gourgue/Trinity-Shop/actions/workflows/ci.yml/badge.svg)](https://github.com/antoine-gourgue/Trinity-Shop/actions/workflows/ci.yml)

Supermarché en ligne de type « drive » : le client remplit son panier dans un catalogue de plus de 1 300 produits réels issus d'[Open Food Facts](https://world.openfoodfacts.org), choisit son magasin parmi plus de 80 drives en France, le retrait au drive ou la livraison à domicile sur un créneau d'une heure, puis paie par carte via Stripe, en mode test. Un back-office permet de suivre les commandes, le catalogue, les stocks et les clients.

> Le paiement passe par [Stripe](https://stripe.com) en mode test (carte `4242 4242 4242 4242`) : aucun débit réel n'est effectué. Sans clé Stripe, le paiement est simulé.

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

- **Choix du magasin** : à la première visite, une fenêtre propose les 81 magasins Trinity, avec une recherche par ville, code postal ou nom (sans tenir compte des accents) un tri par distance (« Autour de moi », ou autour du magasin actuel) et une carte des magasins (Leaflet, OpenStreetMap), synchronisée avec la liste. Le magasin est gardé dans un cookie, puis sur le compte du client connecté : il le retrouve sur tous ses appareils et peut en changer depuis le haut de chaque page. Le catalogue, les prix et le stock sont communs à tous les magasins.
- **Catalogue par rayons** avec sous-rayons, pagination et filtres combinables : promotions, bio, tranche de prix, Nutri-Score, marques (avec recherche quand la liste est longue) et gamme (marque U ou marques nationales).
- **Tri** par prix, par nom ou par prix au kilo ou au litre, calculé à partir de la contenance du produit.
- **Recherche** tolérante aux accents, avec des suggestions pendant la frappe : rayons correspondants et premiers produits, avec navigation au clavier.
- **Fiche produit** : photo officielle du fabricant, prix et prix au kilo, promotion (avec sa date de fin), ingrédients avec allergènes mis en évidence, tableau nutritionnel, Nutri-Score, produits similaires.
- **Favoris** : un cœur sur chaque produit et dans l'en-tête (avec leur nombre), la page « Mes favoris » avec « Tout ajouter au panier » pour refaire ses courses habituelles en un clic, et une rangée « Vos favoris » sur l'accueil.
- **Panier** conservé sur le compte, qui signale les ruptures de stock ; pour chaque article, le client accepte ou non un produit de remplacement.
- **Tunnel de commande** : retrait gratuit au drive du magasin choisi ou livraison à domicile depuis ce magasin (adresse choisie ou ajoutée à la volée), choix du créneau (8 commandes au plus par heure dans chaque drive, créneaux complets grisés), puis paiement par carte via Stripe. Le stock est décompté à la commande.
- **Suivi de commande** : statut (reçue, en préparation, prête, retirée ou livrée, annulée) et frise d'avancement, et « Racheter cette commande ».
- **E-mails au design du site** : bienvenue avec confirmation de l'adresse, confirmation de commande avec la facture PDF, suivi à chaque étape (en préparation, prête au drive ou en route, retirée ou livrée), annulation avec le montant remboursé, mot de passe oublié.
- **E-mails commerciaux** : rappel de panier abandonné (un seul par panier) et alerte quand des favoris passent en promotion (une seule par promotion), envoyés seulement vers une adresse confirmée, chacun avec sa désinscription en un clic et son réglage dans l'espace client.
- **Carte Trinity** (fidélité) : 1 point par euro dépensé, 100 points = un bon de 5 € à utiliser au paiement.
- **Espace client** : magasin du compte, commandes et factures PDF, favoris, adresses, téléphone, informations personnelles, mot de passe et carte de fidélité.
- **Compte** : inscription avec confirmation de l'adresse e-mail (lien signé valable 7 jours, renvoyable depuis l'espace client, redemandé après un changement d'adresse), connexion, mot de passe oublié par lien envoyé par e-mail (valable une heure), tentatives limitées contre les attaques par force brute.
- **Scanner de code-barres** : un produit du catalogue ouvre sa fiche, sinon la fiche Open Food Facts s'affiche.
- **Application installable** (PWA) et pages d'information : FAQ, programme de fidélité, contact, mentions légales, confidentialité, cookies.
- **Référencement** : sitemap, robots.txt, URL canoniques, Open Graph et données structurées schema.org sur les fiches produit.

### Back-office (`/admin`, rôle administrateur)

- **Tableau de bord** : chiffre d'affaires, commandes et inscriptions sur la période, avec graphiques.
- **Commandes** : recherche, filtres par statut, livraison et magasin, détail avec le choix de remplacement de chaque article ; l'équipe fait avancer la commande d'une étape à l'autre, l'annule (paiement par carte remboursé, articles remis en stock, points de fidélité rétablis, client prévenu par e-mail) ou supprime une commande annulée.
- **Produits** : création à partir du code-barres (fiche pré-remplie depuis Open Food Facts : catégories du site, photo, prix suggéré), édition, promotions avec date de fin, masquage du catalogue, suppression (refusée si le produit a déjà été commandé).
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
| Paiement | [Stripe Checkout](https://stripe.com/docs/payments/checkout) (mode test), webhook de confirmation |
| Divers | Leaflet et OpenStreetMap (carte des magasins), pdf-lib (factures), Resend + React Email (e-mails de compte, de commande, rappels et alertes), next-pwa, react-qr-barcode-scanner |
| Tests | Jest (unitaires), Playwright (parcours de bout en bout) |
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
    ├── e2e/                   Parcours Playwright (base jetable uniquement)
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

Le seed crée les 81 magasins, le catalogue, 100 comptes clients fictifs (au mot de passe aléatoire) et le compte administrateur `admin@trinity.fr`, dont le mot de passe est celui de `SEED_ADMIN_PASSWORD`.

> Prisma lit `.env`, pas `.env.local`. Pour lancer une commande Prisma avec les variables de `.env.local` : `set -a; source .env.local; set +a; npx prisma db push`.

## Variables d'environnement

Le modèle est dans [`trinity/.env.example`](trinity/.env.example).

| Variable | Rôle |
|---|---|
| `POSTGRES_PRISMA_URL` | URL de connexion avec pool, utilisée par l'application |
| `POSTGRES_URL_NON_POOLING` | URL directe, utilisée par `prisma db push` et les migrations |
| `NEXTAUTH_SECRET` | Clé de signature des sessions et des liens envoyés par e-mail : désinscription, confirmation d'adresse (`openssl rand -base64 32`) ; `AUTH_SECRET` est accepté à la place |
| `RESEND_API_KEY` | Facultatif : tous les e-mails (compte, commandes, rappels de panier, alertes promo) ; sans clé, rien n'est envoyé et le lien de réinitialisation s'affiche dans la console en développement |
| `APP_URL` | Facultatif : URL publique du site (liens des e-mails, URL canoniques, Open Graph, sitemap, robots.txt) ; à défaut, le domaine de production Vercel, sinon `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Facultatif : clé secrète Stripe (`sk_test_…`) pour le paiement par carte ; sans clé, le paiement est simulé |
| `STRIPE_WEBHOOK_SECRET` | Facultatif : secret du webhook Stripe (`whsec_…`) envoyé à `/api/payments/stripe/webhook`, pour créer la commande même si le client ne revient pas sur le site |
| `EMAIL_FROM` | Facultatif : autre expéditeur des e-mails, sur un domaine validé dans le compte Resend de la clé ; par défaut `Trinity <no-reply@trinity.antoinegourgue.dev>` |
| `CRON_SECRET` | Secret des tâches planifiées : `/api/cron/maintenance` la nuit (fin des promotions datées, purge des compteurs de tentatives) et `/api/cron/emails` l'après-midi (rappels de panier, alertes promo des favoris) ; Vercel l'envoie à chaque appel |
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
| `npm run test:e2e` | Parcours Playwright sur la version construite ; ils créent comptes et commandes, donc refusent de tourner hors de la CI sans `E2E_DISPOSABLE_DATABASE=1` |
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
| `prisma/sync-stores.ts` | Enregistre les magasins de `prisma/stores-data.ts` (création ou mise à jour) et rattache au magasin historique de Rennes les commandes passées avant le choix du magasin |

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
2. **Build** : `next build` sur une base PostgreSQL jetable, remplie par le seed, puis les parcours Playwright dans Chrome : choix du magasin, recherche, inscription, favoris, panier, créneau, paiement, suivi, rachat, puis préparation et annulation par l'équipe. La base de production n'est jamais utilisée.

## Déploiement

L'application est déployée sur **Vercel**, qui construit chaque commit de `main`. Les jobs **« Lint, types, tests »** et **« Build »** de la CI sont déclarés comme [Deployment Checks](https://vercel.com/docs/deployment-checks) du projet Vercel : une nouvelle version de production n'est mise en ligne qu'une fois la CI réussie (attente de 15 minutes au plus).

Variables à définir dans Vercel : `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `NEXTAUTH_SECRET` (ou `AUTH_SECRET`) et, si besoin, `RESEND_API_KEY`.

## Conventions

- Commits au format [Conventional Commits](https://www.conventionalcommits.org) : `type(portée facultative): description`, par exemple `feat(checkout): offer home delivery`.
  Types utilisés : `feat` (fonctionnalité), `fix` (correction), `refactor`, `test`, `docs`, `style`, `chore` (outillage, dépendances) et `ci`. Un `!` après le type signale un changement incompatible.
- Code et messages de commit en anglais, interface et commentaires en français.
