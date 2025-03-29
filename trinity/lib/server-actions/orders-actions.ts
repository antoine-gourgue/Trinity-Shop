'use server'

import prisma from '@/lib/prisma'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fetch from 'node-fetch'

export async function deleteOrder(orderId: string) {
    return prisma.order.delete({
        where: { id: orderId },
    });
}


function truncateText(text: string, maxWidth: number, font: any, fontSize: number) {
    while (font.widthOfTextAtSize(text, fontSize) > maxWidth) {
        text = text.slice(0, -1);
    }
    return text + "...";
}


export async function generateInvoice(orderId: string): Promise<string> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: true,
            billingAddress: true,
            cart: {
                include: {
                    productsInCart: {
                        include: { product: true },
                    },
                },
            },
        },
    });

    if (!order) {
        throw new Error("Commande introuvable");
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;
    let currentY = height - margin;

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const noir = rgb(0, 0, 0);
    const grisClair = rgb(0.9, 0.9, 0.9);
    const grisMoyen = rgb(0.6, 0.6, 0.6);
    const accent = rgb(0.2, 0.47, 0.8);


    const boxSpacing = 20;
    const boxWidth = (width - 2 * margin - boxSpacing) / 2;
    const boxHeight = 80;

    page.drawRectangle({
        x: margin,
        y: currentY - boxHeight,
        width: boxWidth,
        height: boxHeight,
        color: grisClair,
        borderColor: grisMoyen,
        borderWidth: 1,
    });
    page.drawText("Trinity", {
        x: margin + 10,
        y: currentY - 25,
        size: 14,
        font: fontBold,
        color: noir,
    });
    page.drawText("19-22 Bd Saint-Conwoïon, 35000 Rennes", {
        x: margin + 10,
        y: currentY - 40,
        size: 10,
        font: fontRegular,
        color: noir,
    });
    page.drawText("Tél : 02 57 22 08 54", {
        x: margin + 10,
        y: currentY - 55,
        size: 10,
        font: fontRegular,
        color: noir,
    });

    const clientBoxX = margin + boxWidth + boxSpacing;
    page.drawRectangle({
        x: clientBoxX,
        y: currentY - boxHeight,
        width: boxWidth,
        height: boxHeight,
        color: grisClair,
        borderColor: grisMoyen,
        borderWidth: 1,
    });
    page.drawText("Facturé à :", {
        x: clientBoxX + 10,
        y: currentY - 25,
        size: 12,
        font: fontBold,
        color: noir,
    });
    page.drawText(`${order.user.firstName} ${order.user.lastName}`, {
        x: clientBoxX + 10,
        y: currentY - 40,
        size: 10,
        font: fontRegular,
        color: noir,
    });
    page.drawText(`${order.user.email}`, {
        x: clientBoxX + 10,
        y: currentY - 55,
        size: 10,
        font: fontRegular,
        color: noir,
    });
    if (order.billingAddress) {
        const { street, zipCode, city, country } = order.billingAddress;
        page.drawText(`${street}, ${zipCode} ${city}, ${country}`, {
            x: clientBoxX + 10,
            y: currentY - 70,
            size: 10,
            font: fontRegular,
            color: noir,
        });
    }


    currentY = currentY - boxHeight - 30;

    page.drawText("FACTURE", {
        x: margin,
        y: currentY,
        size: 22,
        font: fontBold,
        color: noir,
    });
    page.drawText(`Commande n° : ${order.id}`, {
        x: width - margin - 220,
        y: currentY + 5,
        size: 12,
        font: fontRegular,
        color: noir,
    });
    currentY -= 20;
    page.drawText(`Date : ${new Date(order.createdAt).toLocaleDateString()}`, {
        x: width - margin - 220,
        y: currentY + 5,
        size: 12,
        font: fontRegular,
        color: noir,
    });
    currentY -= 30;

    const colPositions = {
        image: margin,
        name: margin + 60,
        quantity: margin + 260,
        unitPrice: margin + 330,
        total: margin + 420,
    };

    page.drawText("Produit", {
        x: colPositions.name,
        y: currentY,
        size: 12,
        font: fontBold,
        color: noir,
    });
    page.drawText("Quantité", {
        x: colPositions.quantity,
        y: currentY,
        size: 12,
        font: fontBold,
        color: noir,
    });
    page.drawText("Prix unitaire", {
        x: colPositions.unitPrice,
        y: currentY,
        size: 12,
        font: fontBold,
        color: noir,
    });
    page.drawText("Total", {
        x: colPositions.total,
        y: currentY,
        size: 12,
        font: fontBold,
        color: noir,
    });
    currentY -= 15;
    page.drawLine({
        start: { x: margin, y: currentY },
        end: { x: width - margin, y: currentY },
        thickness: 0.5,
        color: grisMoyen,
    });
    currentY -= 15;

    let grandTotal = 0;
    const imageSize = 40;

    for (const item of order.cart.productsInCart) {
        const { product, quantity } = item;
        const lineTotal = product.price * quantity;
        grandTotal += lineTotal;

        let embeddedImage = null;
        try {
            const res = await fetch(product.picture);
            const imageBytes = await res.arrayBuffer();
            embeddedImage = await pdfDoc.embedJpg(new Uint8Array(imageBytes));
        } catch (error) {
            console.error(`Erreur lors du chargement de l'image pour ${product.name}:`, error);
        }

        if (embeddedImage) {
            page.drawImage(embeddedImage, {
                x: colPositions.image,
                y: currentY - imageSize + 10,
                width: imageSize,
                height: imageSize,
            });
        } else {
            page.drawRectangle({
                x: colPositions.image,
                y: currentY - imageSize + 10,
                width: imageSize,
                height: imageSize,
                color: grisClair,
                borderColor: grisMoyen,
                borderWidth: 1,
            });
        }

        const maxProductNameWidth = colPositions.quantity - colPositions.name - 10;

        const truncatedName = truncateText(product.name, maxProductNameWidth, fontRegular, 10);
        page.drawText(truncatedName, {
            x: colPositions.name,
            y: currentY,
            size: 10,
            font: fontRegular,
            color: noir,
        });

        page.drawText(quantity.toString(), {
            x: colPositions.quantity,
            y: currentY,
            size: 10,
            font: fontRegular,
            color: noir,
        });
        page.drawText(`${(product.price/1000).toFixed(2)} €`, {
            x: colPositions.unitPrice,
            y: currentY,
            size: 10,
            font: fontRegular,
            color: noir,
        });
        page.drawText(`${(lineTotal/1000).toFixed(2)} €`, {
            x: colPositions.total,
            y: currentY,
            size: 10,
            font: fontRegular,
            color: noir,
        });
        currentY -= imageSize + 10;
    }

    currentY -= 10;
    page.drawLine({
        start: { x: margin, y: currentY },
        end: { x: width - margin, y: currentY },
        thickness: 1,
        color: grisMoyen,
    });
    currentY -= 20;
    page.drawText(`Total : ${(grandTotal/1000).toFixed(2)} €`, {
        x: width - margin - 150,
        y: currentY,
        size: 14,
        font: fontBold,
        color: noir,
    });

    const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: false });
    return pdfBase64;
}

export async function getOrderById(orderId: string) {
    return prisma.order.findUnique({
        where: { id: orderId },
        include: {
            cart: {
                include: {
                    productsInCart: {
                        include: {
                            product: {
                                include: {
                                    brand: true,
                                    categories: {
                                        include: {
                                            category: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            user: {
                include: {
                    addresses: true,
                },
            },
            shippingAddress: true,
            billingAddress: true,
        },
    });
}

