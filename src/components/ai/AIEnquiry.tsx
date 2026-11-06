"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestAI } from '@/lib/ai-client';
import type { SavedAIResult } from '@/lib/ai-types';
import { AIResultView } from './AIResultView';
export function AIEnquiry({ websiteId, submissionId, onDraft }: { websiteId: string; submissionId: string; onDraft?: (subject: string, body: string) => void }) {
  const [value, setValue] = useState<SavedAIResult | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function run(action: 'summary' | 'reply') {
    setBusy(true); setError(''); setValue(null);
    try { const response = await requestAI(action, websiteId, { submissionId }); setValue(response); if (action === 'reply' && onDraft) onDraft(response.result.subject, response.result.body); }
    catch (e) { setError(e instanceof Error ? e.message : 'AI request failed.'); } finally { setBusy(false); }
  }
  return <div className="space-y-3"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => run('summary')}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}Summarize & tag</Button><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => run('reply')}>Draft reply</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error} <Link className="underline" href="/ai">AI settings</Link></p>}{value && <AIResultView value={value} />}</div>;
}
