// Expéditeur des e-mails du site. Resend n'envoie que depuis un domaine validé dans le compte
// de la clé RESEND_API_KEY : EMAIL_FROM permet d'en changer, sinon le domaine du site
export function emailSender() {
  return process.env.EMAIL_FROM?.trim() || "Trinity <no-reply@trinity.antoinegourgue.dev>";
}
