"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { EMAIL_TOPICS, topicSetting, type EmailTopic } from "@/lib/email-preferences";

// Le client active ou coupe un type d'e-mail commercial (rappels de panier, alertes promo) depuis son espace
export async function setEmailPreference(topic: EmailTopic, enabled: boolean): Promise<{ ok: boolean }> {
  const parsed = z.object({ topic: z.enum(EMAIL_TOPICS), enabled: z.boolean() }).safeParse({ topic, enabled });
  const session = await auth();
  if (!parsed.success || !session?.user?.id) return { ok: false };

  await prisma.user.update({ where: { id: session.user.id }, data: topicSetting(parsed.data.topic, parsed.data.enabled) });
  revalidatePath("/user/info");
  return { ok: true };
}
