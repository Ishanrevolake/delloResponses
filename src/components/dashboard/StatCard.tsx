import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-muted-foreground/20 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-md">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {description && (
                    <p className={`text-xs mt-1 ${trend === 'up' ? 'text-emerald-500' :
                            trend === 'down' ? 'text-rose-500' : 'text-muted-foreground'
                        }`}>
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
