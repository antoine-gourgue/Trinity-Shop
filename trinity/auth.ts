  import NextAuth from "next-auth";
  import Credentials from "next-auth/providers/credentials";
  import createUserRepository from "./services/auth/createUserRepository";
  import signinUser from "./services/auth/signinUser";
  import { signinUserSchema } from "./schemas/signinUserSchema";
  import { createUserSchema } from "./schemas/createUserSchema";
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
        authorize: async (credentials) => {
          if (!credentials.firstName) {
            const parsedUser = signinUserSchema.safeParse(credentials);

            if (!parsedUser.success) {
              throw new Error("Invalid credentials.");
            }

            return signinUser(parsedUser.data);
          }

          const parsedUser = createUserSchema.safeParse(credentials);

          if (!parsedUser.success) {
            throw new Error("Invalid credentials.");
          }

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
          token.role = user.role;
          token.cartId = userData?.carts[0]?.id || null;
          token.billingAddress = userData?.addresses[0]?.id || null;
        }
        return token;
      },

      async session({ session, token }) {
        session.user = {
          ...session.user,
          id: token.id,
          email: token.email,
          role: token.role,
          cartId: token.cartId,
          billingAddress: token.billingAddress,
        };
        return session;
      },
    },

    secret: process.env.NEXTAUTH_SECRET,

    pages: {
      signIn: "/auth/signin",
    },
  });
