import { Users, ShoppingBasket, Banana, Package, LogOut } from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import LogOutAdmin from "@/components/admin/LogOutAdmin";

// Menu items.
const items = [
    {
        title: "Utilisateurs",
        url: "/admin",
        icon: Users,
    },
    {
        title: "Commandes",
        url: "/admin/orders",
        icon: ShoppingBasket,
    },
    {
        title: "Produits",
        url: "/admin/products",
        icon: Banana,
    },
    {
        title: "Stocks",
        url: "/admin/stocks",
        icon: Package,
    },
];

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-primary flex gap-2">
                        <Image
                            src="/assets/trinity-logo.png"
                            alt="Logo"
                            width={40}
                            height={40}
                        />
                        <b>Admin Panel</b>
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <LogOutAdmin />
            </SidebarFooter>
        </Sidebar>
    );
}