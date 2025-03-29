import { Role } from "@prisma/client";
import isAuthorize from "./isAuthorize";
import { NextResponse } from "next/server";

export default async function authMiddleware(role: Role = "Customer") {
    if (await isAuthorize(role)) {
        return;
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
