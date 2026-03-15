import {
    SubmissionsTrendChart,
    ActivityHeatmap
} from "@/components/analytics/AnalyticsCharts";
import { getUserDashboardData } from "@/lib/data-fetcher";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function AnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { submissions, lineChartData } = await getUserDashboardData();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground mt-1">
                    Deep dive into your form metrics and user engagement patterns.
                </p>
            </div>

            <div className="grid gap-6 grid-cols-1">
                <SubmissionsTrendChart data={lineChartData} />
                <ActivityHeatmap submissions={submissions} />
            </div>
        </div>
    );
}
