import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { StatCard } from "@/components/dashboard/StatCard";
import { SubmissionsOverTime, SubmissionsByWebsite } from "@/components/dashboard/OverviewCharts";
import { MessageSquareText, Activity, Globe, Percent } from "lucide-react";
import { getUserDashboardData } from "@/lib/data-fetcher";
import { format } from "date-fns";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { websites, submissions, lineChartData, barChartData } = await getUserDashboardData();

  const totalSubmissions = websites.reduce((acc: number, site: any) => acc + site.totalSubmissions, 0);
  const activeWebsites = websites.filter((s: any) => s.status === 'active').length;

  // Calculate conversion rate based on active websites vs total
  const conversionRate = websites.length > 0 
    ? `${((activeWebsites / websites.length) * 100).toFixed(1)}%`
    : "0%";

  // Calculate Submissions today dynamically
  const todayFormat = format(new Date(), 'MMM dd');
  const todaySubmissions = lineChartData.find((d: any) => d.date === todayFormat)?.submissions || 0;

  // Calculate submissions since last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const submissionsSinceLastHour = submissions.filter(
    (s: any) => new Date(s.timestamp) > oneHourAgo
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your form submissions and website performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Submissions"
          value={totalSubmissions.toLocaleString()}
          description={websites.length > 0 ? `From ${websites.length} websites` : "No websites added yet"}
          icon={MessageSquareText}
          trend="neutral"
        />
        <StatCard
          title="Today's Submissions"
          value={todaySubmissions}
          description={`${submissionsSinceLastHour} since last hour`}
          icon={Activity}
          trend={submissionsSinceLastHour > 0 ? "up" : "neutral"}
        />
        <StatCard
          title="Active Websites"
          value={`${activeWebsites} / ${websites.length}`}
          description={websites.length - activeWebsites > 0 
            ? `${websites.length - activeWebsites} website${websites.length - activeWebsites > 1 ? 's' : ''} inactive` 
            : "All websites active"}
          icon={Globe}
          trend="neutral"
        />
        <StatCard
          title="Avg. Conversion Rate"
          value={conversionRate}
          description="Based on status"
          icon={Percent}
          trend="neutral"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <SubmissionsOverTime data={lineChartData} />
        <SubmissionsByWebsite data={barChartData} />
      </div>
    </div>
  );
}
