import type { AIAction, SavedAIResult } from './ai-types';
export async function requestAI(action: AIAction, websiteId: string, input: Record<string, unknown> = {}): Promise<SavedAIResult> {
  const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, websiteId, ...input }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'AI request failed.');
  return data;
}
export function defaultGym<T extends { name: string; id: string }>(websites: T[]) {
  return websites.find(w => w.name.toLowerCase().replace(/[^a-z]/g, '').includes('graftgym'))?.id || websites[0]?.id || '';
}
