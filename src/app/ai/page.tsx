import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserDashboardData } from '@/lib/data-fetcher';
import { AIWorkspace } from '@/components/ai/AIWorkspace';
export default async function AIPage({ searchParams }: { searchParams: Promise<{ website?: string; submission?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { websites, submissions } = await getUserDashboardData();
  const params = await searchParams;
  return <AIWorkspace websites={websites} submissions={submissions} initialWebsiteId={params.website} initialSubmissionId={params.submission} />;
}
