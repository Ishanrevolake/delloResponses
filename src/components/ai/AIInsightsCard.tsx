"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestAI, defaultGym } from '@/lib/ai-client';
import type { Website } from '@/lib/types';
import type { SavedAIResult } from '@/lib/ai-types';
import { AIResultView } from './AIResultView';
export function AIInsightsCard({ websites }: { websites: Website[] }) {
  const [site, setSite] = useState(defaultGym(websites));
  const [value, setValue] = useState<SavedAIResult | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function generate() { setBusy(true); setError(''); setValue(null); try { setValue(await requestAI('insights', site)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not generate insights.'); } finally { setBusy(false); } }
  return <section className="space-y-4 rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" />Weekly AI insights</h2><p className="mt-1 text-sm text-muted-foreground">Enquiry trends over the last seven days, compared with the previous week.</p></div><Link href="/ai" className="text-sm text-primary underline underline-offset-4">Open AI workspace</Link></div><div className="flex flex-wrap gap-3"><select aria-label="Insights website" className="rounded-md border bg-background px-3 py-2 text-sm" value={site} disabled={busy} onChange={e => { setSite(e.target.value); setValue(null); setError(''); }}>{websites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select><Button disabled={busy || !site} onClick={generate}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}{busy ? 'Analyzing…' : 'Generate insights'}</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error} <Link href="/ai" className="underline">Open settings</Link></p>}{value && <AIResultView value={value} />}</section>;
}
