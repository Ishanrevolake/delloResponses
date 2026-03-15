import { Bell, Search, User } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Header() {
    return (
        <header className="flex h-16 items-center border-b bg-card/50 px-4 md:px-6 backdrop-blur-sm sticky top-0 z-30">
            {/* Mobile Menu Placeholder (Would add Sheet here typically) */}
            <div className="mr-4 block md:hidden">
                <Button variant="outline" size="icon">
                    <span className="sr-only">Toggle Menu</span>
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </Button>
            </div>

            <div className="flex flex-1 items-center gap-4 md:gap-8">
                <form className="flex-1 sm:max-w-md ml-auto md:ml-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search responses, websites..."
                            className="w-full bg-background pl-9 md:w-[300px] lg:w-[400px] rounded-full border-muted-foreground/20 focus-visible:ring-primary/50"
                        />
                    </div>
                </form>

                <div className="ml-auto flex items-center gap-2">
                    <LogoutButton />
                </div>
            </div>
        </header>
    );
}
