"use client";

import { LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { signOut } from "next-auth/react";

export default function LogOutAdmin() {
    return (
        <Button onClick={() => signOut()} variant={"link"} size={"icon"}>
            <LogOut />
        </Button>
    );
}
