import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/sidebar/app-sidebar";
import { Toaster } from "@/components/ui/toaster";
import isAuthorize from "@/services/auth/isAuthorize";
import CallToActionAdminConnect from "@/components/admin/CallToActionAdminConnect";

export default async function Layout({
                                         children,
                                     }: {
    children: React.ReactNode;
}) {
    if (!(await isAuthorize("Admin"))) {
        return (
            <div className="w-full h-screen flex flex-col gap-10 justify-center items-center">
                <p className="text-xl">
                    Vous n'êtes pas autorisé à vous rendre sur le panel admin
                </p>
                <CallToActionAdminConnect />
            </div>
        );
    }
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="w-full relative">
                <SidebarTrigger className="absolute top-4 left-4" />
                {children}
            </main>
            <Toaster />
        </SidebarProvider>
    );
}
