"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async (formData: FormData) => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLoggingOut(false);
        }
    };

    return (
        <form action={handleLogout}>
            <Button 
                type="submit" 
                variant="secondary" 
                size="icon" 
                disabled={isLoggingOut}
                className="rounded-full bg-muted border border-border/50 text-muted-foreground hover:text-red-400 transition-all active:scale-95"
            >
                {isLoggingOut ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <LogOut className="h-5 w-5" />
                )}
                <span className="sr-only">Logout</span>
            </Button>
        </form>
    );
}
