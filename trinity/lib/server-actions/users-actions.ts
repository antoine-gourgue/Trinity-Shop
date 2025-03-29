'use server'

import prisma from "@/lib/prisma"
import {Role} from "@prisma/client";
import bcrypt from "bcrypt";

interface UpdateUserEmailProps {
    userId: string;
    newEmail: string;
}

interface AddressData {
    street: string;
    city: string;
    zipCode: string;
    country: string;
    type: "domicile" | "livraison";
}

export async function updateUser(
    userId: string,
    firstName: string,
    lastName: string,
    email: string,
    phone: string | null,
    role: string
) {
    return prisma.user.update({
        where: { id: userId },
        data: {
            firstName,
            lastName,
            email,
            phone,
            role: role as Role,
        },
    });
}

export async function deleteUser(userId: string) {
    try {
        await prisma.user.delete({
            where: { id: userId },
        });

        return { success: true };
    } catch (error) {
        console.error("Erreur lors de la suppression de l'utilisateur:", error);
        return { success: false, message: "La suppression a échoué." };
    }
}


export async function getUserById(userId: string) {
    if (!userId) {
        throw new Error("ID utilisateur manquant");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            firstName: true,
            lastName: true,
            email: true,
        },
    });

    if (!user) {
        throw new Error("Utilisateur non trouvé");
    }

    return user;
}


export async function getUserWithAddresses(userId: string) {
    if (!userId) return null;

    try {
        return await prisma.user.findUnique({
            where: {id: userId},
            include: {addresses: true},
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        return null;
    }
}

export async function getUserDetails(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                birthDate: true,
            },
        });

        if (!user) return null;

        return {
            ...user,
            birthDate: user.birthDate ? user.birthDate.toISOString().split('T')[0] : null,
        };
    } catch (error) {
        console.error("Erreur lors de la récupération des détails de l'utilisateur:", error);
        return null;
    }
}


export async function updateUserEmail({ userId, newEmail }: UpdateUserEmailProps) {
    await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
    });
}

export async function updateUserPassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
    });

    if (!user) {
        throw new Error("Utilisateur non trouvé");
    }

    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
        throw new Error("Ancien mot de passe incorrect");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    return prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
    });
}


export async function createUserAddress(userId: string, data: AddressData) {
    return prisma.address.create({
        data: {
            userId,
            ...data,
        },
    });
}


export async function updateUserAddress(addressId: string, data: AddressData) {
    return prisma.address.update({
        where: { id: addressId },
        data,
    });
}

export async function deleteUserAddress(addressId: string) {
    return prisma.address.delete({
        where: { id: addressId },
    });
}

export async function setUserPhone(userId: string, newPhone: string) {
    return prisma.user.update({
        where: { id: userId },
        data: { phone: newPhone },
    });
}

export async function deleteUserPhone(userId: string) {
    return prisma.user.update({
        where: { id: userId },
        data: { phone: null },
    });
}

export async function getUserOrders(userId: string) {
    try {
        return await prisma.order.findMany({
            where: {userId},
            include: {
                cart: {
                    include: {
                        productsInCart: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des commandes :", error);
        return [];
    }
}


