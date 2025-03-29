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

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    throw new Error("Invalid credentials");
  }

  return user;
};

export default signinUser;
