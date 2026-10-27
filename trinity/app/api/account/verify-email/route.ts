import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { confirmEmail } from "@/lib/email-verification";

// Clic sur le lien de confirmation de l'e-mail : l'adresse est confirmée, puis le client voit le résultat
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const outcome = await confirmEmail(params.get("u") ?? "", params.get("x") ?? "", params.get("s") ?? "");
  if (outcome === "verified") revalidatePath("/user", "layout");
  return NextResponse.redirect(new URL(`/legal/confirmation-email?statut=${outcome}`, request.nextUrl.origin));
}
