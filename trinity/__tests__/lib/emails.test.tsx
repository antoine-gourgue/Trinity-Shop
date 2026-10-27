/**
 * @jest-environment node
 */
// Rendu statique de React : le render de React Email charge un module dynamique que Jest refuse
import { renderToStaticMarkup } from "react-dom/server";
import { WelcomeEmail } from "@/components/emails/welcome-email";
import { PasswordResetEmail } from "@/components/emails/password-reset-email";
import { OrderConfirmationEmail } from "@/components/emails/order-confirmation-email";
import { OrderStatusEmail } from "@/components/emails/order-status-email";
import { CartReminderEmail } from "@/components/emails/cart-reminder-email";
import type { InvoiceData } from "@/lib/invoice-pdf";

const SITE = "https://trinity.antoinegourgue.dev";

const SAMPLE_INVOICE: InvoiceData = {
    invoiceNumber: "FAC-M482MY2J",
    orderNumber: "M482MY2J",
    createdAt: new Date("2026-10-26T21:50:00Z"),
    pickupLabel: "Mardi 27 octobre, 11h – 12h",
    delivery: { address: ["12 rue de la Paix", "35000 Rennes"], fee: 5900 },
    loyalty: { discount: 5000, pointsUsed: 100, pointsEarned: 12, cardNumber: "2911 0000 0042" },
    customer: { name: "Antoine Gourgue", email: "antoine@example.com", address: ["12 rue de la Paix", "35000 Rennes", "France"] },
    items: [
        { name: "Pâtes coquillettes au blé complet", brand: "U", netContent: "500 g", quantity: 2, price: 1190, regularPrice: null },
        { name: "Lait 1/2 écrémé", brand: "U", netContent: "6 l", quantity: 1, price: 6990, regularPrice: 7490 },
    ],
};

describe("e-mails", () => {
    it("welcomes a new customer with links to the real site", () => {
        const html = renderToStaticMarkup(<WelcomeEmail firstName="Antoine" siteUrl={SITE} />);

        expect(html).toContain("Antoine, vos courses du quotidien,");
        // Logo du site, chargé depuis le site lui-même
        expect(html).toContain(`src="${SITE}/assets/trinity-logo.png"`);
        expect(html).toContain(`href="${SITE}"`);
        expect(html).toContain(`${SITE}/user/fidelite`);
        expect(html).not.toContain("pioupiou");
    });

    it("sends the reset link with its validity", () => {
        const resetUrl = `${SITE}/auth/reinitialiser?token=abc&email=a%40b.fr`;
        const html = renderToStaticMarkup(<PasswordResetEmail firstName="Antoine" resetUrl={resetUrl} siteUrl={SITE} />);

        expect(html).toContain("Choisir un nouveau mot de passe");
        expect(html).toContain("1 heure");
        expect(html).toContain(resetUrl.replace(/&/g, "&amp;"));
    });

    it("summarises the order, its fees and the amount paid", () => {
        const html = renderToStaticMarkup(
            <OrderConfirmationEmail
                firstName="Antoine"
                invoice={SAMPLE_INVOICE}
                total={13470}
                orderUrl={`${SITE}/user/u1/order/o1`}
                siteUrl={SITE}
            />
        );

        expect(html).toContain("M482MY2J");
        expect(html).toContain("Livraison à domicile");
        expect(html).toContain("Pâtes coquillettes au blé complet");
        expect(html).toContain("13,47");
        expect(html).toContain("+ 12 points");
    });

    it("tells the customer the delivery is being prepared", () => {
        const html = renderToStaticMarkup(
            <OrderStatusEmail status="preparing" firstName="Antoine" orderNumber="M482MY2J" pickupLabel="Mardi 27 octobre, 11h – 12h"
                deliveryAddress="12 rue de Rennes, 35000 Rennes" articleCount={3} orderUrl={`${SITE}/user/u1/order/o1`} siteUrl={SITE} />
        );

        expect(html).toContain("en préparation");
        expect(html).toContain("partiront en livraison");
        expect(html).toContain("Voir ma commande");
    });

    it("tells the customer the order is ready at the drive", () => {
        const html = renderToStaticMarkup(
            <OrderStatusEmail status="ready" firstName="Antoine" orderNumber="M482MY2J" pickupLabel="Mardi 27 octobre, 11h – 12h"
                deliveryAddress={null} articleCount={3} orderUrl={`${SITE}/user/u1/order/o1`} siteUrl={SITE} />
        );

        expect(html).toContain("prêtes au drive !");
        expect(html).toContain("M482MY2J");
    });

    it("explains the refund of a cancelled order", () => {
        const html = renderToStaticMarkup(
            <OrderStatusEmail status="cancelled" firstName="Antoine" orderNumber="M482MY2J" pickupLabel={null} deliveryAddress={null}
                articleCount={3} orderUrl={`${SITE}/user/u1/order/o1`} siteUrl={SITE} refundedAmount={13470} vouchersReturned />
        );

        expect(html).toContain("Remboursement de 13,47");
        expect(html).toContain("bons Carte Trinity");
    });

    it("reminds the cart with an unsubscribe link", () => {
        const html = renderToStaticMarkup(
            <CartReminderEmail firstName="Antoine" siteUrl={SITE} unsubscribeUrl={`${SITE}/api/emails/unsubscribe?u=u1&s=abc`}
                items={[{ name: "Lait 1/2 écrémé", quantity: 2, price: 6990, picture: `${SITE}/products/3256224234494.jpg` }]} />
        );

        expect(html).toContain("quelque chose ?");
        expect(html).toContain(`${SITE}/cart`);
        expect(html).toContain("Ne plus recevoir ces rappels");
        expect(html).toContain("13,98");
    });
});
