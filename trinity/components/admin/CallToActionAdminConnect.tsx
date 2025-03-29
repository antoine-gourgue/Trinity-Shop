"use client";

import { Button } from "../ui/button";
import Link from "next/link";

export default function CallToActionAdminConnect() {
    return (
        <Button asChild>
            <Link href="/auth/signin?callbackUrl=/admin">
                Connectez avec votre compte admin
            </Link>
        </Button>
    );
}
