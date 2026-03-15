import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4">
            <div className="relative">
                <div className="size-12 rounded-full border-4 border-primary/20 animate-pulse" />
                <Loader2 className="size-12 text-primary animate-spin absolute top-0 left-0" />
            </div>
            <p className="text-muted-foreground font-medium animate-pulse">Loading Analytics...</p>
        </div>
    );
}
