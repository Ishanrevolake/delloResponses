"use client";
import { useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EXERCISES, type SavedAIResult } from '@/lib/ai-types';

export function AIResultView({ value }: { value: SavedAIResult }) {
  const [copied, setCopied] = useState(false);
  const r = value.result;
  async function copy() {
    try { await navigator.clipboard.writeText([r.title, r.summary, ...r.highlights, ...r.next_steps, r.subject, r.body, ...r.workouts.map(w => `Day ${w.day}: ${EXERCISES.find(e => e.id === w.exercise_id)?.name} — ${w.sets} sets, ${w.reps}. ${w.notes}`)].filter(Boolean).join('\n\n')); setCopied(true); }
    catch { setCopied(false); }
  }
  return <article className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5" aria-live="polite">
    <div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" />{r.title}</h3><p className="mt-1 text-xs text-muted-foreground">{new Date(value.generatedAt).toLocaleString()} · {value.model} · {value.cached ? 'Saved result' : 'New result'}</p></div><Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}<span className="ml-2">{copied ? 'Copied' : 'Copy'}</span></Button></div>
    {r.category && <Badge variant="secondary">{r.category.replaceAll('_', ' ')}</Badge>}
    <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.summary}</p>
    {r.highlights.length > 0 && <ul className="list-disc space-y-2 pl-5 text-sm">{r.highlights.map((v, i) => <li key={i}>{v}</li>)}</ul>}
    {r.next_steps.length > 0 && <div><h4 className="mb-2 text-sm font-semibold">Suggested next steps</h4><ul className="list-disc space-y-2 pl-5 text-sm">{r.next_steps.map((v, i) => <li key={i}>{v}</li>)}</ul></div>}
    {r.body && <div className="rounded-lg border bg-background/60 p-4 text-sm"><p className="mb-3 font-semibold">{r.subject}</p><p className="whitespace-pre-wrap">{r.body}</p></div>}
    {r.workouts.length > 0 && <div className="overflow-x-auto"><p className="mb-3 text-sm font-medium">Workout draft · Trainer review required</p><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Day</th><th className="p-2">Exercise</th><th className="p-2">Sets / reps or duration</th><th className="p-2">Notes</th></tr></thead><tbody>{r.workouts.map((w, i) => <tr key={i} className="border-b border-border/50"><td className="p-2">{w.day}</td><td className="p-2">{EXERCISES.find(e => e.id === w.exercise_id)?.name}</td><td className="p-2">{w.sets} × {w.reps}</td><td className="p-2">{w.notes}</td></tr>)}</tbody></table></div>}
    {value.evidence && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Source and calculated metrics</summary><pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(value.evidence, null, 2)}</pre></details>}
  </article>;
}
