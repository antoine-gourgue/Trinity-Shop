import { z } from "zod";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { createUserSchema } from "@/schemas/createUserSchema";
import { WelcomeEmail } from "@/components/emails/welcome-email";
import { siteUrl } from "@/lib/site-url";
import { emailSender } from "@/lib/email-sender";
import { VERIFICATION_VALIDITY_DAYS, verificationUrl } from "@/lib/email-verification";
import { Resend } from "resend";
import { EmailAlreadyUsed } from "@/services/auth/errors";

// E-mail de bienvenue avec le lien de confirmation de l'adresse, « au mieux » :
// un échec d'envoi ne doit jamais bloquer l'inscription
async function sendWelcomeEmail(user: { id: string; email: string; firstName: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailSender(),
      to: [user.email],
      subject: `Bienvenue chez Trinity, ${user.firstName} !`,
      react: WelcomeEmail({
        firstName: user.firstName,
        siteUrl: siteUrl(),
        verifyUrl: verificationUrl(user),
        validityDays: VERIFICATION_VALIDITY_DAYS,
      }),
    });
    if (error) console.error("Email de bienvenue non envoyé :", error);
  } catch (err) {
    console.error("Email de bienvenue non envoyé :", err);
  }
}

const createUserRepository = async ({
  firstName,
  lastName,
  password,
  email,
}: z.infer<typeof createUserSchema>) => {
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    throw new EmailAlreadyUsed();
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      password: passwordHash,
    },
    // Champs utiles à la session et à l'e-mail de bienvenue : jamais le mot de passe chiffré
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  await sendWelcomeEmail(user);

  return user;
};

export default createUserRepository;
