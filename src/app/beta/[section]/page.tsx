import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/utils/supabase/server';
import {isBetaSection} from '@/components/beta/pages';
import {BetaWorkspace} from '@/components/beta/BetaWorkspace';
export default async function BetaPage({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!isBetaSection(section))notFound();const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');return <BetaWorkspace section={section}/>;}
