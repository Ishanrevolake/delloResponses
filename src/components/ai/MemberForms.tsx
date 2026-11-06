"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Member, WorkoutLog } from '@/lib/ai-types';
type Profile = Omit<Member, 'id' | 'website_id' | 'created_at'> & { id?: string };
const empty: Profile = { name: '', goal: '', experience: 'beginner', equipment: '', days_per_week: 3, session_minutes: 30, ai_consent: false, trainer_clearance: false };
export function MemberForm({ member, save, disabled, cancel }: { member?: Member; save: (profile: Profile) => Promise<void>; disabled: boolean; cancel: () => void }) {
  const [profile, setProfile] = useState<Profile>(member || empty);
  return <form className="space-y-4 rounded-lg border p-4" onSubmit={async e => { e.preventDefault(); try { await save(profile); } catch { /* Error is displayed by the workspace. */ } }}><h3 className="font-semibold">{member ? 'Edit member' : 'New member'}</h3><fieldset disabled={disabled} className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="member-name">Member name</Label><Input id="member-name" required maxLength={120} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="experience">Experience</Label><select id="experience" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={profile.experience} onChange={e => setProfile({ ...profile, experience: e.target.value })}>{['beginner', 'intermediate', 'advanced'].map(v => <option key={v}>{v}</option>)}</select></div></div>
    <div className="space-y-2"><Label htmlFor="member-goal">Training goal</Label><Textarea id="member-goal" required maxLength={1000} value={profile.goal} onChange={e => setProfile({ ...profile, goal: e.target.value })} placeholder="For example: build a consistent general fitness routine. Avoid medical details." /></div>
    <div className="space-y-2"><Label htmlFor="equipment">Available equipment</Label><Input id="equipment" maxLength={1000} value={profile.equipment} onChange={e => setProfile({ ...profile, equipment: e.target.value })} placeholder="For example: chair, wall, mat, resistance band" /></div>
    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="days">Training days / week</Label><Input id="days" type="number" min={1} max={6} required value={profile.days_per_week} onChange={e => setProfile({ ...profile, days_per_week: Number(e.target.value) })} /></div><div className="space-y-2"><Label htmlFor="duration">Minutes / session</Label><Input id="duration" type="number" min={10} max={120} required value={profile.session_minutes} onChange={e => setProfile({ ...profile, session_minutes: Number(e.target.value) })} /></div></div>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={profile.ai_consent} onChange={e => setProfile({ ...profile, ai_consent: e.target.checked })} />Member has given permission to process their training profile and logs with the selected AI provider.</label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={profile.trainer_clearance} onChange={e => setProfile({ ...profile, trainer_clearance: e.target.checked })} />A qualified trainer has reviewed this member’s suitability for a general exercise draft.</label>
    <div className="flex gap-2"><Button type="submit">{disabled ? 'Saving…' : 'Save member'}</Button><Button type="button" variant="outline" onClick={cancel}>Cancel</Button></div>
  </fieldset></form>;
}
export function WorkoutLogForm({ save, disabled }: { save: (log: Omit<WorkoutLog, 'id' | 'member_id'>) => Promise<void>; disabled: boolean }) {
  const initial = { performed_on: new Date().toISOString().slice(0, 10), exercise: '', minutes: 30, sets: 3, reps: 10, weight_kg: null as number | null, notes: '' };
  const [log, setLog] = useState(initial);
  return <form className="space-y-4 rounded-lg border p-4" onSubmit={async e => { e.preventDefault(); try { await save(log); setLog(initial); } catch { /* Keep the entry so the user can retry. */ } }}><h3 className="font-semibold">Log an exercise</h3><fieldset disabled={disabled} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <div className="space-y-2"><Label htmlFor="log-date">Date (UTC)</Label><Input id="log-date" type="date" required max={initial.performed_on} value={log.performed_on} onChange={e => setLog({ ...log, performed_on: e.target.value })} /></div>
    <div className="space-y-2"><Label htmlFor="log-exercise">Exercise</Label><Input id="log-exercise" required maxLength={120} value={log.exercise} onChange={e => setLog({ ...log, exercise: e.target.value })} /></div>
    {(['minutes', 'sets', 'reps', 'weight_kg'] as const).map(field => <div className="space-y-2" key={field}><Label htmlFor={`log-${field}`}>{{ minutes: 'Minutes', sets: 'Sets', reps: 'Reps per set', weight_kg: 'Weight (kg, optional)' }[field]}</Label><Input id={`log-${field}`} type="number" required={field !== 'weight_kg'} min={field === 'minutes' ? 1 : 0} max={{ minutes: 300, sets: 20, reps: 1000, weight_kg: 1000 }[field]} step={field === 'weight_kg' ? '0.5' : '1'} value={log[field] ?? ''} onChange={e => setLog({ ...log, [field]: field === 'weight_kg' && e.target.value === '' ? null : Number(e.target.value) })} /></div>)}
  </div><div className="space-y-2"><Label htmlFor="log-notes">Training notes</Label><Textarea id="log-notes" maxLength={1000} value={log.notes} onChange={e => setLog({ ...log, notes: e.target.value })} placeholder="Optional training notes. Avoid medical or identifying information." /></div><Button type="submit">{disabled ? 'Saving…' : 'Save workout log'}</Button></fieldset></form>;
}
