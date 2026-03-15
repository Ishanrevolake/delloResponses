import { ResponsesTable } from "@/components/responses/ResponsesTable";
import { getUserDashboardData } from "@/lib/data-fetcher";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function ResponsesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { submissions, websites } = await getUserDashboardData();

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Responses</h1>
                <p className="text-muted-foreground mt-1">
                    Manage and view all form submissions across your websites.
                </p>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <ResponsesTable submissions={submissions} websites={websites} />
            </div>
        </div>
    );
}
