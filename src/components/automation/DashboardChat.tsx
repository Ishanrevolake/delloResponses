"use client";
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Loader2,MessageSquare} from 'lucide-react';
interface ChatEvidence {topic?:string;start?:string;end?:string;matchingClients?:number;matchingDeliveries?:number;clients?:{name:string;email:string;membershipEnd:string|null;status:string}[];deliveries?:{recipient:string;kind:string;status:string;error:string|null}[];metrics?:Record<string,unknown>;}
interface Turn {role:'user'|'assistant';content:string;evidence?:ChatEvidence;}
export function DashboardChat({websiteId}:{websiteId:string}){
 const [turns,setTurns]=useState<Turn[]>([]),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function send(event:React.FormEvent){
  event.preventDefault();if(!question.trim()||busy)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/automation/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({websiteId,question,history:turns.slice(-8).map(t=>({role:t.role,content:t.content.slice(0,3000)}))})});
   const value=await response.json();if(!response.ok)throw new Error(value.error||'Could not answer the question.');
   setTurns(previous=>[...previous,{role:'user',content:question},{role:'assistant',content:value.answer,evidence:value.evidence}]);setQuestion('');
  }catch(e){setError(e instanceof Error?e.message:'Chat request failed.');}finally{setBusy(false);}
 }
 return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare className="size-5 text-primary"/>GraftGym dashboard chatbot</h2><p className="mt-1 text-sm text-muted-foreground">Ask about enquiries, expired memberships, pending follow-ups and email delivery. The chatbot reads data; it cannot send emails or change records.</p></div><Button size="sm" variant="outline" disabled={busy} onClick={()=>{setTurns([]);setError('');}}>Clear conversation</Button></div>
  <div className="max-h-[65vh] space-y-4 overflow-auto" aria-live="polite" role="log" aria-label="Dashboard conversation">
   {turns.length===0&&<div className="rounded-lg border bg-muted/20 p-5 text-sm text-muted-foreground">Try “Who has an expired membership?”, “Which follow-ups are waiting?” or “Were there any email problems this week?” Sync enquiries on the Automation page to include recent submissions.</div>}
   {turns.map((turn,index)=><article key={index} className={`space-y-3 rounded-lg border p-4 ${turn.role==='user'?'ml-4 bg-muted/40':'mr-4 bg-primary/5'}`}><p className="text-xs font-semibold uppercase text-muted-foreground">{turn.role==='user'?'You':'GraftGym assistant'}</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</p>
    {!!turn.evidence?.clients?.length&&<div className="overflow-auto"><p className="mb-2 text-xs text-muted-foreground">Showing up to 50 of {turn.evidence.matchingClients} matching clients.</p><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Client</th><th className="p-2">Email</th><th className="p-2">Membership end</th></tr></thead><tbody>{turn.evidence.clients.map((c,i)=><tr className="border-t" key={i}><td className="p-2">{c.name}</td><td className="p-2">{c.email}</td><td className="p-2">{c.membershipEnd||'Not recorded'}</td></tr>)}</tbody></table></div>}
    {!!turn.evidence?.deliveries?.length&&<ul className="space-y-2 text-sm">{turn.evidence.deliveries.map((d,i)=><li className="rounded border p-2" key={i}>{d.recipient} · {d.kind} · {d.status}<p className="text-xs text-muted-foreground">{d.error}</p></li>)}</ul>}
    {turn.evidence?.metrics&&<details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Calculated metrics and date range</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify({start:turn.evidence.start,end:turn.evidence.end,timezone:'Europe/London',...turn.evidence.metrics},null,2)}</pre></details>}
   </article>)}
  </div>
  <form className="flex flex-wrap gap-2" onSubmit={send}><Input aria-label="Ask the dashboard" className="min-w-48 flex-1" placeholder="Ask about GraftGym’s dashboard…" required maxLength={1000} disabled={busy} value={question} onChange={e=>setQuestion(e.target.value)}/><Button disabled={busy||!question.trim()} type="submit">{busy?<><Loader2 className="mr-2 size-4 animate-spin"/>Checking records…</>:'Ask'}</Button></form>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  <p className="text-xs text-muted-foreground">Conversation is kept in this tab only and resets when you leave. AI answers may be imperfect; matching records and calculated metrics are shown for verification.</p>
 </section>;
}
