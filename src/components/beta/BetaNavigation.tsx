"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Gauge,UserRoundPlus,Users,Megaphone,Filter,Workflow,CalendarDays,ClipboardCheck,UsersRound,TrendingUp,ListChecks,PlugZap} from 'lucide-react';
import {betaPages} from './pages';
const icons=[Gauge,UserRoundPlus,Users,Megaphone,Filter,Workflow,CalendarDays,ClipboardCheck,UsersRound,TrendingUp,ListChecks,PlugZap];
export function BetaNavigation(){const pathname=usePathname();return <div className="mt-5 border-t border-border pt-4"><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">GraftGym previews</p><div className="max-h-[calc(100vh-26rem)] min-h-40 space-y-1 overflow-y-auto pr-1">{betaPages.map((page,index)=>{const Icon=icons[index],active=pathname===`/beta/${page.id}`;return <Link key={page.id} href={`/beta/${page.id}`} aria-current={active?'page':undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active?'bg-primary/10 text-primary':'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4 shrink-0"/><span className="min-w-0 flex-1">{page.label}</span><span className="rounded border border-amber-500/25 bg-amber-500/5 px-1 py-0.5 text-[8px] uppercase tracking-wider text-amber-400">Beta</span></Link>;})}</div></div>;}
