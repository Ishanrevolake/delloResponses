import {redirect} from 'next/navigation';
import {createClient} from '@/utils/supabase/server';
import {getUserDashboardData} from '@/lib/data-fetcher';
import {AutomationWorkspace} from '@/components/automation/AutomationWorkspace';
export default async function AutomationPage(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {websites}=await getUserDashboardData();
 return <AutomationWorkspace websites={websites.filter(w=>w.name.toLowerCase().replace(/[^a-z]/g,'')==='graftgym')}/>;
}
