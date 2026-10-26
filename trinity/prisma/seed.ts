import { PrismaClient, Role, nutriScore, Product } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import productsDataJson from "../data/complete_products.json";

const prisma = new PrismaClient();

function nutriScoreToEnum(value: string): nutriScore {
  switch (value?.toLowerCase()) {
    case "a": return nutriScore.A;
    case "b": return nutriScore.B;
    case "c": return nutriScore.C;
    case "d": return nutriScore.D;
    case "e": return nutriScore.E;
    default: return nutriScore.unknown;
  }
}

interface JsonProduct {
  name: string;
  barCode: string;
  image_url?: string;
  categories: string[];
  nutriscore?: string;
  brands: string[];
  price?: number;
  regularPrice?: number | null;
  quantity?: string | null;
  hidden?: boolean;
  description?: string;
  stockId?: string;
}

const productsData = productsDataJson as JsonProduct[];

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  // Mot de passe du compte administrateur : jamais écrit dans le dépôt, qui est public.
  // Vérifié avant tout, car le seed commence par vider la base.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error("Définir SEED_ADMIN_PASSWORD (12 caractères au moins) pour créer le compte administrateur.");
  }

  try {
    console.log("🔄 Suppression des anciennes données...");
    await prisma.productInCart.deleteMany();
    await prisma.order.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.session.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.account.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.categoriesProducts.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.user.deleteMany();
    await prisma.address.deleteMany()
    console.log("✅ Toutes les données ont été supprimées.\n");

    console.log("🚀 Ajout de l'utilisateur admin...");
    const adminEmail = "admin@trinity.fr";
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const hashedPassword = await hashPassword(adminPassword);
      const admin = await prisma.user.create({
        data: {
          firstName: "Admin",
          lastName: "Trinity",
          email: adminEmail,
          phone: faker.phone.number(),
          password: hashedPassword,
          role: Role.Admin,
          birthDate: faker.date.birthdate({ min: 30, max: 50, mode: 'age' }),
        },
      });

      await prisma.address.create({
        data: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          zipCode: faker.location.zipCode(),
          country: faker.location.country(),
          userId: admin.id,
          type: "domicile",
        },
      });

      console.log(`✅ Utilisateur admin créé avec l'email : ${adminEmail}\n`);
    } else {
      console.log(`✅ L'utilisateur admin existe déjà : ${adminEmail}\n`);
    }

    console.log("🚀 Création de 100 utilisateurs...");
    // Comptes de démonstration : mot de passe aléatoire, personne n'a à s'y connecter
    const hashedPasswords = await hashPassword(randomBytes(24).toString("base64url"));
    const users = await Promise.all(
        Array.from({ length: 100 }).map(async () => {
          const user = await prisma.user.create({
            data: {
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              email: faker.internet.email(),
              phone: faker.phone.number(),
              password: hashedPasswords,
              role: faker.helpers.arrayElement([Role.Customer, Role.Seller]),
              birthDate: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
            },
          });

          await prisma.address.createMany({
            data: [
              {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                zipCode: faker.location.zipCode(),
                country: faker.location.country(),
                userId: user.id,
                type: "domicile",
              },
              {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                zipCode: faker.location.zipCode(),
                country: faker.location.country(),
                userId: user.id,
                type: "livraison",
              },
            ],
          });

          return user;
        })
    );
    console.log(`✅ ${users.length} utilisateurs créés avec adresses !\n`);

    console.log("📌 Extraction & insertion des catégories uniques...");
    const allCategories = new Set<string>();

    for (const product of productsData) {
      for (const catName of product.categories || []) {
        allCategories.add(catName.trim());
      }
    }

    for (const catName of allCategories) {
      await prisma.category.create({
        data: { name: catName },
      });
    }
    console.log(`✅ ${allCategories.size} catégories créées.\n`);

    console.log("🚀 Insertion des marques et des produits...");
    const brandCache = new Map<string, string>();
    const createdProducts: Product[] = [];

    for (const product of productsData) {
      const brandName = product.brands?.[0] || "Marque inconnue";

      let brandId: string;
      if (brandCache.has(brandName)) {
        brandId = brandCache.get(brandName)!;
      } else {
        const newBrand = await prisma.brand.create({
          data: { name: brandName },
        });
        brandId = newBrand.id;
        brandCache.set(brandName, brandId);
      }

      const createdProduct = await prisma.product.create({
        data: {
          name: product.name,
          barCode: BigInt(product.barCode),
          picture: product.image_url || "",
          nutriScore: nutriScoreToEnum(product.nutriscore || ""),
          brandId,
          price: product.price ?? faker.number.int({ min: 100, max: 10000 }),
          regularPrice: product.regularPrice ?? null,
          netContent: product.quantity ?? null,
          hidden: product.hidden ?? false,
          description: product.description ?? faker.commerce.productDescription(),
          categories: {
            create: product.categories.map((cat) => ({
              category: {
                connect: { name: cat.trim() },
              },
            })),
          },
        },
      });

      createdProducts.push(createdProduct);
      console.log(`✅ Produit ajouté : ${createdProduct.name}`);
    }

    console.log("\n🚀 Ajout du stock pour chaque produit...");
    for (const prodCreated of createdProducts) {
      const quantity = Math.floor(Math.random() * 500) + 1;
      await prisma.stock.create({
        data: {
          productId: prodCreated.id,
          quantity,
        },
      });
      console.log(`✅ Stock créé pour ${prodCreated.name} => ${quantity}`);
    }

    // ✅ Création des paniers et des commandes
    console.log("🚀 Création des Carts et Orders...");
    for (const user of users) {
      const cart = await prisma.cart.create({
        data: { userId: user.id },
      });

      const userAddresses = await prisma.address.findMany({
        where: { userId: user.id },
      });

      const billingAddressId = userAddresses.find((addr) => addr.type === "domicile")?.id || faker.database.mongodbObjectId();

      await prisma.order.create({
        data: {
          cartId: cart.id,
          userId: user.id,
          validated: Math.random() > 0.5,
          billingAddressId: billingAddressId,
        },
      });



      const randomProducts = createdProducts.sort(() => 0.5 - Math.random()).slice(0, 5);
      for (const product of randomProducts) {
        await prisma.productInCart.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            quantity: Math.floor(Math.random() * 3) + 1,
          },
        });
      }
    }
    console.log("✅ Carts et Orders créés avec adresses !");

    console.log("🎉 Seeding terminé avec succès !");
  } catch (error) {
    console.error("❌ Erreur pendant le seeding :", error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
    .then(() => console.log("✅ Seeding terminé !"))
    .catch(async (e) => {
      console.error("❌ Seeding échoué :", e);
      await prisma.$disconnect();
      process.exit(1);
    });
