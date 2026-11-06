"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EXERCISES, type AISettings } from '@/lib/ai-types';
export function AISettingsForm({ initial, save, disabled, provider = 'the selected AI provider' }: { provider?: string; initial: AISettings; save: (settings: AISettings) => Promise<void>; disabled: boolean }) {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(false);
  return <form className="space-y-5" onSubmit={async e => { e.preventDefault(); setSaved(false); try { await save(settings); setSaved(true); } catch { /* Error is displayed by the workspace. */ } }}>
    <div><h2 className="text-lg font-semibold">GraftGym business context</h2><p className="mt-1 text-sm text-muted-foreground">Keep the facts current. Unknown details will be omitted or requested in reply drafts.</p></div>
    <fieldset disabled={disabled} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">{(['business_name', 'opening_hours', 'tone'] as const).map(field => <div key={field} className="space-y-2"><Label htmlFor={field}>{({ business_name: 'Business name', opening_hours: 'Opening hours', tone: 'Reply tone' })[field]}</Label><Input id={field} required={field !== 'opening_hours'} maxLength={field === 'business_name' ? 120 : field === 'tone' ? 200 : 1000} value={settings[field]} onChange={e => { setSaved(false); setSettings({ ...settings, [field]: e.target.value }); }} /></div>)}</div>
      <div className="grid gap-4 md:grid-cols-2">{(['services', 'prices'] as const).map(field => <div className="space-y-2" key={field}><Label htmlFor={field}>{field === 'services' ? 'Services and booking information' : 'Prices, currency and conditions'}</Label><Textarea id={field} rows={5} maxLength={field === 'services' ? 4000 : 2000} value={settings[field]} onChange={e => { setSaved(false); setSettings({ ...settings, [field]: e.target.value }); }} placeholder={field === 'services' ? 'Add verified services and booking details.' : 'Add verified prices. Leave blank if not available.'} /></div>)}</div>
      <label className="flex items-start gap-3 rounded-lg border p-4 text-sm"><input type="checkbox" className="mt-1" checked={settings.ai_enabled} onChange={e => { setSaved(false); setSettings({ ...settings, ai_enabled: e.target.checked }); }} /><span><strong>Enable AI for this website</strong><span className="mt-1 block text-muted-foreground">I authorize sending selected enquiry text, business information, and consenting members’ training data to {provider}. Known email addresses and phone numbers are masked; free text may still contain personal details. AI results are saved privately to this dashboard.</span></span></label>
      <div className="rounded-lg border p-4"><h3 className="font-medium">Trainer-approved exercise library</h3><p className="mb-4 mt-1 text-sm text-muted-foreground">A qualified trainer should approve exercises for use in draft plans. Member suitability is confirmed separately.</p><div className="grid gap-3 md:grid-cols-2">{EXERCISES.map(ex => <label key={ex.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.approved_exercises.includes(ex.id)} onChange={e => { setSaved(false); setSettings({ ...settings, approved_exercises: e.target.checked ? [...settings.approved_exercises, ex.id] : settings.approved_exercises.filter(id => id !== ex.id) }); }} /><span>{ex.name}<span className="text-muted-foreground"> · {ex.equipment}</span></span></label>)}</div></div>
      <div className="flex items-center gap-3"><Button type="submit">{disabled ? 'Saving…' : 'Save AI settings'}</Button>{saved && <span role="status" className="text-sm text-emerald-400">Settings saved</span>}</div>
    </fieldset>
  </form>;
}
