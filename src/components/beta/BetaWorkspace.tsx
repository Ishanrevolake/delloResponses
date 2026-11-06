"use client";
import {useRouter} from 'next/navigation';
import {X} from 'lucide-react';
import {betaPages,type BetaSection} from './pages';
import {useBeta} from './store';
import {OverviewPreview,LeadsPreview,MembersPreview,FunnelPreview,WorkflowsPreview,ClassesPreview,TasksPreview} from './CorePages';
import {CampaignsPreview} from './CampaignsPreview';
import {TeamPreview} from './TeamPreview';
import {GrowthPreview,CoveragePreview,ConnectionsPreview} from './UtilityPages';
import {styles as s} from './ui';
const views={overview:OverviewPreview,leads:LeadsPreview,members:MembersPreview,campaigns:CampaignsPreview,funnel:FunnelPreview,workflows:WorkflowsPreview,classes:ClassesPreview,tasks:TasksPreview,team:TeamPreview,growth:GrowthPreview,coverage:CoveragePreview,connect:ConnectionsPreview};
export function BetaWorkspace({section}:{section:BetaSection}){const router=useRouter();const model=useBeta();const page=betaPages.find(p=>p.id===section)!;const View=views[section];return <div className={s.root}><div className={s.eyebrow}>GRAFT GYM <span className={s.beta}>BETA</span></div><div className={s.banner}><span><strong>UI preview · sample data.</strong> Changes are temporary. AI, imports, messages and integrations are not connected.</span><select className={s.mobileNav} aria-label="Beta page" value={section} onChange={e=>router.push('/beta/'+e.target.value)}>{betaPages.map(p=><option key={p.id} value={p.id}>{p.label} · Beta</option>)}</select></div><header className={s.header}><div><h1>{page.title}</h1><p className={s.sub}>{page.description}</p></div></header>{model.notice&&<div role="status" className={s.notice}><span>{model.notice}</span><button type="button" className={s.iconButton} aria-label="Dismiss notification" onClick={()=>model.setNotice('')}><X size={16}/></button></div>}<View key={section}/></div>;}
