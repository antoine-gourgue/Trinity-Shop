import { SessionProvider } from "next-auth/react";
import Header from "@/components/general/header";
import Sidebar from "@/components/general/sidebar";
import HeaderMobile from "@/components/general/header-mobile";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex flex-1">
          <div className="hidden md:block w-64 shrink-0 border-r border-gray-200">
            <Sidebar />
          </div>
          <main className="flex-1 p-4 bg-gray-50">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
