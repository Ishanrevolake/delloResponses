import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Globe, MoreVertical, ArrowRight, Activity, Moon } from "lucide-react";

import { getUserDashboardData } from "@/lib/data-fetcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function WebsitesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { websites } = await getUserDashboardData();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Websites</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your connected websites and their form integrations.
                    </p>
                </div>
                <Button>Add Website</Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {websites.map((site) => (
                    <Card key={site.id} className="bg-card/50 backdrop-blur-sm border-muted-foreground/20 hover:border-primary/50 transition-colors flex flex-col group">
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg leading-none tracking-tight">{site.name}</h3>
                                    {site.status === "active" ? (
                                        <Badge variant="default" className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-transparent h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider">
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-muted-foreground/15 text-muted-foreground hover:bg-muted-foreground/25 border-transparent h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider">
                                            Inactive
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5" />
                                    {site.domain}
                                </p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -m-2 opacity-50 hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">Open menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem>Edit Settings</DropdownMenuItem>
                                    <DropdownMenuItem>Integration Code</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-rose-500">Delete Website</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="flex-1 pt-4 pb-2">
                            <div className="flex justify-between items-end">
                                <div>
                                    <div className="text-3xl font-bold tracking-tight group-hover:text-primary transition-colors">
                                        {site.totalSubmissions.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        Total Submissions
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-foreground/80 flex items-center justify-end gap-1.5">
                                        {site.status === "active" ? <Activity className="h-3.5 w-3.5 text-primary" /> : <Moon className="h-3.5 w-3.5 text-muted-foreground" />}
                                        Last active
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {formatDistanceToNow(new Date(site.lastSubmissionDate), { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 border-t border-muted-foreground/10 bg-muted/10 items-center justify-center p-0">
                            <Button asChild variant="ghost" className="w-full rounded-none rounded-b-lg h-12 justify-between hover:bg-primary/10 hover:text-primary px-6">
                                <Link href={`/responses`}>
                                    View Submissions
                                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
