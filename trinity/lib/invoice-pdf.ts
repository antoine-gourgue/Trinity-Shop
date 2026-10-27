import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { formatBrand } from "./format";

// Facture PDF d'une commande, au format A4, aux couleurs de la boutique

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  createdAt: Date;
  pickupLabel: string | null;
  // Magasin qui prépare la commande (null pour une commande d'avant le choix du magasin)
  store: { name: string; address: string[]; phone: string | null } | null;
  // Livraison à domicile (null pour un retrait au drive)
  delivery: { address: string[]; fee: number } | null;
  loyalty: { discount: number; pointsUsed: number; pointsEarned: number; cardNumber: string | null };
  customer: { name: string; email: string; address: string[] };
  items: {
    name: string;
    brand: string | null;
    netContent: string | null;
    quantity: number;
    price: number;
    regularPrice: number | null;
  }[];
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const FOOTER_TOP = 70;
const VAT_RATE = 0.055;
// Taux normal, appliqué aux frais de livraison
const SERVICE_VAT_RATE = 0.2;

const COLORS = {
  brandDark: rgb(0, 0.333, 0.384),
  primary: rgb(0, 0.49, 0.561),
  highlight: rgb(1, 0.82, 0),
  promo: rgb(0.89, 0.024, 0.075),
  text: rgb(0.11, 0.15, 0.16),
  muted: rgb(0.38, 0.42, 0.44),
  light: rgb(0.957, 0.965, 0.969),
  border: rgb(0.86, 0.89, 0.9),
  white: rgb(1, 1, 1),
};

// Vendeur : le magasin qui a préparé la commande
function sellerLines(store: InvoiceData["store"]) {
  if (!store) return ["Trinity Shop", "Courses en ligne"];
  return ["Trinity Shop", store.name, ...store.address, ...(store.phone ? [`Tél. ${store.phone}`] : [])];
}

// Montant en millièmes d'euro → « 12,34 € » (espaces simples : les polices PDF standard
// ne connaissent pas l'espace fine insécable produite par Intl)
function euros(amount: number) {
  return `${(amount / 1000).toFixed(2).replace(".", ",")} €`;
}

export async function buildInvoicePdf(data: InvoiceData) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Facture ${data.invoiceNumber}`);
  pdf.setAuthor("Trinity Shop");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(pdf);

  // Les polices standard n'encodent que le jeu WinAnsi : on remplace le reste
  const encodable = new Map<string, boolean>();
  const clean = (text: string) =>
    [...text.normalize("NFC").replace(/[  ]/g, " ")]
      .map((char) => {
        if (!encodable.has(char)) {
          try {
            regular.encodeText(char);
            encodable.set(char, true);
          } catch {
            encodable.set(char, false);
          }
        }
        return encodable.get(char) ? char : char.normalize("NFD").replace(/[^\x20-\x7e]/g, "") || "?";
      })
      .join("");

  const fit = (text: string, font: PDFFont, size: number, maxWidth: number) => {
    let value = clean(text);
    if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
    while (value.length > 1 && font.widthOfTextAtSize(`${value}…`, size) > maxWidth) value = value.slice(0, -1);
    return `${value.trimEnd()}…`;
  };

  const write = (
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    { size = 9.5, font = regular, color = COLORS.text, align = "left" as "left" | "right" } = {}
  ) => {
    const value = clean(text);
    const width = font.widthOfTextAtSize(value, size);
    page.drawText(value, { x: align === "right" ? x - width : x, y, size, font, color });
  };

  // En-tête de la première page
  let page = pdf.addPage([A4.width, A4.height]);
  const top = A4.height;
  page.drawRectangle({ x: 0, y: top - 112, width: A4.width, height: 112, color: COLORS.brandDark });
  page.drawRectangle({ x: 0, y: top - 116, width: A4.width, height: 4, color: COLORS.highlight });

  page.drawRectangle({ x: MARGIN, y: top - 80, width: 46, height: 46, color: COLORS.white });
  if (logo) {
    page.drawImage(logo, { x: MARGIN + 7, y: top - 73, width: 32, height: 32 });
  } else {
    write(page, "T", MARGIN + 15, top - 67, { size: 24, font: bold, color: COLORS.brandDark });
  }
  write(page, "TRINITY", MARGIN + 58, top - 54, { size: 20, font: bold, color: COLORS.white });
  write(page, "COURSES EN LIGNE", MARGIN + 58, top - 70, { size: 8, font: bold, color: COLORS.highlight });

  const right = A4.width - MARGIN;
  write(page, "FACTURE", right, top - 52, { size: 26, font: bold, color: COLORS.white, align: "right" });
  write(page, `N° ${data.invoiceNumber}`, right, top - 70, { size: 10, color: COLORS.white, align: "right" });
  write(
    page,
    `Émise le ${data.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" })}`,
    right,
    top - 84,
    { size: 9, color: rgb(0.85, 0.92, 0.93), align: "right" }
  );

  // Vendeur, client et commande
  const blockTop = top - 150;
  const blockWidth = (A4.width - 2 * MARGIN - 32) / 3;
  const orderLines = [
    `Commande n° ${data.orderNumber}`,
    `Passée le ${data.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`,
    ...(data.delivery
      ? ["Livraison à domicile :", ...(data.pickupLabel ? [data.pickupLabel] : []), ...data.delivery.address]
      : data.pickupLabel
        ? ["Retrait au drive :", data.pickupLabel]
        : ["Retrait au drive"]),
    "Paiement : carte bancaire (démo)",
  ];
  const blocks = [
    { label: "VENDEUR", lines: sellerLines(data.store) },
    { label: "FACTURÉ À", lines: [data.customer.name, ...data.customer.address, data.customer.email] },
    { label: "COMMANDE", lines: orderLines },
  ];
  blocks.forEach((block, index) => {
    const x = MARGIN + index * (blockWidth + 16);
    write(page, block.label, x, blockTop, { size: 8, font: bold, color: COLORS.primary });
    page.drawRectangle({ x, y: blockTop - 6, width: 24, height: 2, color: COLORS.highlight });
    block.lines.forEach((line, lineIndex) => {
      const isTitle = lineIndex === 0;
      page.drawText(fit(line, isTitle ? bold : regular, 9.5, blockWidth), {
        x,
        y: blockTop - 22 - lineIndex * 14,
        size: 9.5,
        font: isTitle ? bold : regular,
        color: isTitle ? COLORS.text : COLORS.muted,
      });
    });
  });

  // Tableau des articles
  const columns = { name: MARGIN + 10, quantity: 360, unit: 450, total: right - 10 };
  const nameWidth = columns.quantity - columns.name - 40;
  const drawTableHeader = (targetPage: PDFPage, y: number) => {
    targetPage.drawRectangle({ x: MARGIN, y: y - 8, width: A4.width - 2 * MARGIN, height: 26, color: COLORS.brandDark });
    write(targetPage, "Désignation", columns.name, y, { size: 9, font: bold, color: COLORS.white });
    write(targetPage, "Qté", columns.quantity, y, { size: 9, font: bold, color: COLORS.white, align: "right" });
    write(targetPage, "Prix unitaire", columns.unit, y, { size: 9, font: bold, color: COLORS.white, align: "right" });
    write(targetPage, "Montant", columns.total, y, { size: 9, font: bold, color: COLORS.white, align: "right" });
    return y - 26;
  };

  // Le tableau commence sous le bloc le plus long
  const longestBlock = Math.max(...blocks.map((block) => block.lines.length));
  let y = drawTableHeader(page, blockTop - Math.max(120, 36 + longestBlock * 14));
  const rowHeight = 34;
  let subtotal = 0;
  let savings = 0;
  let articles = 0;

  data.items.forEach((item, index) => {
    if (y - rowHeight < FOOTER_TOP + 10) {
      page = pdf.addPage([A4.width, A4.height]);
      y = drawTableHeader(page, A4.height - MARGIN - 10);
    }

    const lineTotal = item.price * item.quantity;
    const discount = item.regularPrice && item.regularPrice > item.price ? item.regularPrice : null;
    subtotal += (discount ?? item.price) * item.quantity;
    savings += discount ? (discount - item.price) * item.quantity : 0;
    articles += item.quantity;

    if (index % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: y - rowHeight + 18, width: A4.width - 2 * MARGIN, height: rowHeight, color: COLORS.light });
    }

    page.drawText(fit(item.name, bold, 9.5, nameWidth), { x: columns.name, y, size: 9.5, font: bold, color: COLORS.text });
    const details = [item.brand && formatBrand(item.brand), item.netContent].filter(Boolean).join(" · ");
    if (details) {
      page.drawText(fit(details, regular, 8, nameWidth), { x: columns.name, y: y - 12, size: 8, font: regular, color: COLORS.muted });
    }
    if (discount) {
      const promoText = `Promo -${Math.round((1 - item.price / discount) * 100)} % (au lieu de ${euros(discount)})`;
      const offset = details ? regular.widthOfTextAtSize(clean(details), 8) + 8 : 0;
      write(page, promoText, columns.name + offset, y - 12, { size: 8, font: bold, color: COLORS.promo });
    }

    write(page, String(item.quantity), columns.quantity, y - 4, { align: "right" });
    write(page, euros(item.price), columns.unit, y - 4, { align: "right", color: discount ? COLORS.promo : COLORS.text });
    write(page, euros(lineTotal), columns.total, y - 4, { align: "right", font: bold });
    y -= rowHeight;
  });

  page.drawLine({ start: { x: MARGIN, y: y + 14 }, end: { x: right, y: y + 14 }, thickness: 0.75, color: COLORS.border });

  // Totaux : sur une nouvelle page s'il ne reste pas la place
  const totalsHeight = 190;
  if (y - totalsHeight < FOOTER_TOP) {
    page = pdf.addPage([A4.width, A4.height]);
    y = A4.height - MARGIN - 10;
  }

  const fee = data.delivery?.fee ?? 0;
  const total = subtotal - savings - data.loyalty.discount + fee;
  const vat = total - fee - (total - fee) / (1 + VAT_RATE) + (fee - fee / (1 + SERVICE_VAT_RATE));
  const boxX = right - 230;
  let lineY = y - 10;
  const totalLine = (label: string, value: string, color = COLORS.text) => {
    write(page, label, boxX, lineY, { size: 9.5, color: COLORS.muted });
    write(page, value, right, lineY, { size: 9.5, font: bold, color, align: "right" });
    lineY -= 17;
  };
  totalLine(`Sous-total (${articles} article${articles > 1 ? "s" : ""})`, euros(subtotal));
  if (savings > 0) totalLine("Remises promotions", `- ${euros(savings)}`, COLORS.promo);
  if (data.loyalty.discount > 0) {
    totalLine(`Bons Carte Trinity (${data.loyalty.pointsUsed} pts)`, `- ${euros(data.loyalty.discount)}`, COLORS.promo);
  }
  totalLine("Préparation de la commande", "Offerte", COLORS.primary);
  if (data.delivery) totalLine("Livraison à domicile", fee > 0 ? euros(fee) : "Offerte", fee > 0 ? COLORS.text : COLORS.primary);

  lineY -= 16;
  page.drawRectangle({ x: boxX - 10, y: lineY - 12, width: right - boxX + 10, height: 32, color: COLORS.brandDark });
  write(page, "TOTAL TTC", boxX, lineY, { size: 11, font: bold, color: COLORS.white });
  write(page, euros(total), right - 8, lineY - 1, { size: 15, font: bold, color: COLORS.highlight, align: "right" });
  const vatLabel = fee > 0 ? "dont TVA (5,5 % et 20 %)" : `dont TVA ${String(VAT_RATE * 100).replace(".", ",")} %`;
  write(page, `${vatLabel} : ${euros(vat)}`, right, lineY - 30, {
    size: 8,
    color: COLORS.muted,
    align: "right",
  });
  if (data.loyalty.cardNumber) {
    write(page, `Carte Trinity n° ${data.loyalty.cardNumber}`, right, lineY - 44, { size: 8, color: COLORS.muted, align: "right" });
    if (data.loyalty.pointsEarned > 0) {
      write(page, `+ ${data.loyalty.pointsEarned} points cumulés avec cette commande`, right, lineY - 57, {
        size: 8,
        font: bold,
        color: COLORS.primary,
        align: "right",
      });
    }
  }

  // Remerciement à gauche des totaux
  write(page, "Merci pour votre commande !", MARGIN, y - 10, { size: 13, font: bold, color: COLORS.brandDark });
  const thanks = [
    "Vos courses sont préparées par nos équipes et vous",
    data.delivery ? "seront livrées au créneau choisi." : "attendent au drive au créneau choisi.",
    "Retrouvez vos commandes dans votre espace client.",
  ];
  thanks.forEach((line, index) => write(page, line, MARGIN, y - 28 - index * 13, { size: 9, color: COLORS.muted }));

  // Pied de page et pagination sur chaque page
  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    current.drawLine({ start: { x: MARGIN, y: 48 }, end: { x: right, y: 48 }, thickness: 0.5, color: COLORS.border });
    write(current, "Trinity Shop · Projet de démonstration : paiement simulé, aucun débit réel.", MARGIN, 34, {
      size: 7.5,
      color: COLORS.muted,
    });
    write(current, `Page ${index + 1} / ${pages.length}`, right, 34, { size: 7.5, color: COLORS.muted, align: "right" });
  });

  return pdf.saveAsBase64({ dataUri: false });
}

async function loadLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(join(process.cwd(), "public/assets/trinity-logo.png"));
    return await pdf.embedPng(bytes);
  } catch {
    // Fichier absent du bundle serveur : on se contente du monogramme
    return null;
  }
}
