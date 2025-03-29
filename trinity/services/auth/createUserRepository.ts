import { z } from "zod";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { createUserSchema } from "@/schemas/createUserSchema";
import  EmailTemplate  from '@/components/email-template';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const createUserRepository = async ({
                                      firstName,
                                      lastName,
                                      password,
                                      email,
                                    }: z.infer<typeof createUserSchema>) => {
  const passwordHash = bcrypt.hashSync(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      password: passwordHash,
      // cart: {},
    },
  });

  if (!user) {
    throw new Error("Could not create user.");
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Trinity <no-reply@pioupiou.tech>',
      to: [user.email],
      subject: 'Félicitations, votre nouveau Trinity est actif',
      react: EmailTemplate({ firstName: user.firstName }),
    });

    if (error) {
      console.error("Email sending error:", error);
      throw new Error("Could not send email.");
    }

    return user;
  } catch (err) {
    console.error("Unexpected error:", err);
    throw new Error("Could not send email.");
  }
};

export default createUserRepository;