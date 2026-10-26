  import NextAuth from "next-auth";
  import Credentials from "next-auth/providers/credentials";
  import createUserRepository from "./services/auth/createUserRepository";
  import signinUser from "./services/auth/signinUser";
  import { signinUserSchema } from "./schemas/signinUserSchema";
  import { createUserSchema } from "./schemas/createUserSchema";
  import { InvalidSignupData, TooManyAttempts } from "./services/auth/errors";
  import { RATE_LIMITS, clearRateLimit, clientIp, hitRateLimit } from "./lib/rate-limit";
  import prisma from "./lib/prisma";

  export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
      Credentials({
        credentials: {
          email: {},
          password: {},
          firstName: {},
          lastName: {},
          role: {},
        },
        authorize: async (credentials, request) => {
          const ip = clientIp(request.headers);

          if (!credentials.firstName) {
            const parsedUser = signinUserSchema.safeParse(credentials);

            if (!parsedUser.success) {
              return null;
            }

            // Tentatives limitées par adresse e-mail et par IP, contre le test de mots de passe en masse
            const emailKey = `signin:${parsedUser.data.email.toLowerCase()}`;
            const allowed =
              (await hitRateLimit(emailKey, RATE_LIMITS.signinEmail)) &&
              (await hitRateLimit(`signin-ip:${ip}`, RATE_LIMITS.signinIp));
            if (!allowed) throw new TooManyAttempts();

            const user = await signinUser(parsedUser.data);
            if (user) await clearRateLimit(emailKey);
            return user;
          }

          const parsedUser = createUserSchema.safeParse(credentials);

          if (!parsedUser.success) {
            throw new InvalidSignupData();
          }

          if (!(await hitRateLimit(`signup-ip:${ip}`, RATE_LIMITS.signupIp))) throw new TooManyAttempts();

          return createUserRepository(parsedUser.data);
        },
      }),
    ],

    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          const userData = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              carts: { where: { archived: false }, select: { id: true } },
              addresses: { where: { type: "domicile" }, select: { id: true } },
            },
          });

          token.id = user.id;
          token.email = user.email;
          token.firstName = user.firstName;
          token.lastName = user.lastName;
          token.role = user.role;
          token.cartId = userData?.carts[0]?.id || null;
          token.billingAddress = userData?.addresses[0]?.id || null;
        }
        return token;
      },

      async session({ session, token }) {
        const { id, email, firstName, lastName, role } = token;
        // Le jeton est complété à la connexion : sans ces champs, la session reste celle par défaut
        if (id && email && firstName !== undefined && lastName !== undefined && role) {
          session.user = {
            ...session.user,
            id,
            email,
            firstName,
            lastName,
            role,
            cartId: token.cartId ?? null,
            billingAddress: token.billingAddress ?? null,
          };
        }
        return session;
      },
    },

    secret: process.env.NEXTAUTH_SECRET,

    pages: {
      signIn: "/auth/signin",
    },
  });
