"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import logo from "@/Images/logotypo.png";
import {
    LayoutDashboard,
    MessageSquare,
    Globe,
    BarChart3,
    Settings,
    Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Responses", href: "/responses", icon: MessageSquare },
    { name: "Websites", href: "/websites", icon: Globe },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden border-r bg-card/50 md:block md:w-64 lg:w-72 flex-shrink-0 transition-all duration-300">
            <div className="flex h-16 items-center px-6 border-b">
                <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
                    <div className="relative size-8 flex items-center justify-center overflow-hidden">
                        <Image 
                            src={logo} 
                            alt="Dello Dash Logo" 
                            width={32} 
                            height={32}
                            className="object-contain"
                        />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Dello Dash
                    </span>
                </div>
            </div>
            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} href={item.href}>
                            <span
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                            >
                                <item.icon className={`size-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
