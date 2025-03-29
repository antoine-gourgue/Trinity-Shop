import { SessionProvider } from "next-auth/react";
import Header from "@/components/general/header";

export default function UserLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 p-4 bg-gray-50">{children}</main>
            </div>
        </SessionProvider>
    );
}
