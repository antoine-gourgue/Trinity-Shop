import { z } from "zod";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { signinUserSchema } from "@/schemas/signinUserSchema";

const signinUser = async ({
  password,
  email,
}: z.infer<typeof signinUserSchema>) => {
  const user = await prisma.user.findUnique({
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      firstName: true,
      lastName: true,
    },
    where: {
      email,
    },
  });

  // null => NextAuth renvoie « identifiants invalides », sans préciser lequel est faux
  if (!user) {
    return null;
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    return null;
  }

  return user;
};

export default signinUser;
